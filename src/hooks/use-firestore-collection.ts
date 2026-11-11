'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Query,
  QueryConstraint,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  WhereFilterOp,
} from 'firebase/firestore';

import {
  db as firestoreDB,
} from '@/lib/firebase';

import {
  errorEmitter,
} from '@/firebase/error-emitter';

import {
  FirestorePermissionError,
  type SecurityRuleContext,
} from '@/firebase/errors';


export type FirestoreQueryFilter = [
  string,
  WhereFilterOp,
  any
];


export function useFirestoreCollection<
  T extends { id: string }
>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = [],
  enabled: boolean = true
) {

  const [data, setData] =
    useState<T[]>([]);

  const [loading, setLoading] =
    useState(enabled);


  /*
  ==================================================
  FILTROS ESTÁVEIS
  ==================================================
  */

  const filtersJSON =
    useMemo(
      () => JSON.stringify(initialFilters),
      [initialFilters]
    );


  /*
  ==================================================
  LEITURA DA COLEÇÃO
  ==================================================
  */

  useEffect(() => {

    if (!enabled) {

      setData([]);

      setLoading(false);

      return;

    }


    setLoading(true);


    const parsedFilters:
      FirestoreQueryFilter[] =
        JSON.parse(filtersJSON);


    const areFiltersValid =
      parsedFilters.every(
        filter =>
          filter[2] !== undefined
      );


    if (!areFiltersValid) {

      setData([]);

      setLoading(false);

      return;

    }


    const collectionRef =
      collection(
        firestoreDB,
        collectionName
      );


    const constraints:
      QueryConstraint[] = [];


    /*
    ------------------------------------------------
    FILTROS
    ------------------------------------------------
    */

    parsedFilters.forEach(
      filter => {

        if (
          filter[2] !== undefined &&
          filter[2] !== null &&
          filter[2] !== ''
        ) {

          constraints.push(

            where(
              filter[0],
              filter[1],
              filter[2]
            )

          );

        }

      }
    );


    /*
    ------------------------------------------------
    ORDENAÇÃO
    ------------------------------------------------
    */

    if (initialSort) {

      constraints.push(
        orderBy(initialSort)
      );

    }


    const q: Query =
      query(
        collectionRef,
        ...constraints
      );


    /*
    ------------------------------------------------
    LISTENER FIRESTORE
    ------------------------------------------------
    */

    const unsubscribe =
      onSnapshot(

        q,

        {
          includeMetadataChanges: true,
        },

        snapshot => {

          const firestoreData =
            snapshot.docs.map(
              document => {

                return {

                  id:
                    document.id,

                  ...document.data(),

                } as T;

              }
            );


          setData(
            firestoreData
          );


          setLoading(false);


          /*
          ==========================================
          DIAGNÓSTICO OFFLINE
          ==========================================
          */

          if (
            snapshot.metadata.fromCache
          ) {

            console.info(
              `[Firestore] ${collectionName}: dados carregados do cache local.`
            );

          }


          if (
            snapshot.metadata.hasPendingWrites
          ) {

            console.info(
              `[Firestore] ${collectionName}: alterações aguardando sincronização.`
            );

          }

        },


        error => {

          console.error(
            `[Firestore] Erro ao ler coleção ${collectionName}:`,
            error
          );


          const permissionError =
            new FirestorePermissionError({

              path:
                collectionRef.path,

              operation:
                'list',

            } satisfies SecurityRuleContext);


          errorEmitter.emit(
            'permission-error',
            permissionError
          );


          setLoading(false);

        }

      );


    return () => {

      unsubscribe();

    };


  }, [
    collectionName,
    initialSort,
    filtersJSON,
    enabled,
  ]);


  /*
  ==================================================
  ADICIONAR DOCUMENTO
  ==================================================

  FUNCIONAMENTO LOCAL-FIRST

  1. Gera ID imediatamente
  2. Firestore grava no IndexedDB
  3. Retorna ID imediatamente
  4. Quando internet voltar, sincroniza

  ==================================================
  */

  const addDocument = (
    newData:
      Omit<T, 'id' | 'createdAt'>
  ): string => {


    const collectionRef =
      collection(
        firestoreDB,
        collectionName
      );


    /*
    ------------------------------------------------
    GERA ID LOCAL
    ------------------------------------------------
    */

    const newDocRef =
      doc(collectionRef);


    /*
    ------------------------------------------------
    GRAVA SEM BLOQUEAR A INTERFACE
    ------------------------------------------------
    */

    void setDoc(

      newDocRef,

      {

        ...newData,

        createdAt:
          Timestamp.now(),

      }

    )
      .then(() => {

        console.info(
          `[Firestore] Documento sincronizado: ${newDocRef.id}`
        );

      })
      .catch(error => {

        console.error(
          `[Firestore] Erro ao sincronizar documento ${newDocRef.id}:`,
          error
        );


        const permissionError =
          new FirestorePermissionError({

            path:
              newDocRef.path,

            operation:
              'create',

            requestResourceData:
              newData,

          } satisfies SecurityRuleContext);


        errorEmitter.emit(
          'permission-error',
          permissionError
        );

      });


    /*
    ------------------------------------------------
    RETORNO IMEDIATO
    ------------------------------------------------
    */

    console.info(
      `[Firestore] Documento criado localmente: ${newDocRef.id}`
    );


    return newDocRef.id;

  };


  /*
  ==================================================
  ATUALIZAR DOCUMENTO
  ==================================================
  */

  const updateDocument = (
    id: string,
    updatedData: Partial<T>
  ) => {


    const docRef =
      doc(
        firestoreDB,
        collectionName,
        id
      );


    void updateDoc(
      docRef,
      updatedData
    )
      .then(() => {

        console.info(
          `[Firestore] Documento atualizado: ${id}`
        );

      })
      .catch(error => {

        console.error(
          `[Firestore] Erro ao atualizar documento ${id}:`,
          error
        );


        const permissionError =
          new FirestorePermissionError({

            path:
              docRef.path,

            operation:
              'update',

            requestResourceData:
              updatedData,

          } satisfies SecurityRuleContext);


        errorEmitter.emit(
          'permission-error',
          permissionError
        );

      });

  };


  /*
  ==================================================
  EXCLUIR DOCUMENTO
  ==================================================
  */

  const deleteDocument = (
    id: string
  ) => {


    const docRef =
      doc(
        firestoreDB,
        collectionName,
        id
      );


    void deleteDoc(
      docRef
    )
      .then(() => {

        console.info(
          `[Firestore] Documento excluído: ${id}`
        );

      })
      .catch(error => {

        console.error(
          `[Firestore] Erro ao excluir documento ${id}:`,
          error
        );


        const permissionError =
          new FirestorePermissionError({

            path:
              docRef.path,

            operation:
              'delete',

          } satisfies SecurityRuleContext);


        errorEmitter.emit(
          'permission-error',
          permissionError
        );

      });

  };


  /*
  ==================================================
  RETORNO DO HOOK
  ==================================================
  */

  return {

    data,

    loading,

    addDocument,

    updateDocument,

    deleteDocument,

  };

}