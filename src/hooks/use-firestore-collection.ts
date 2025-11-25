// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect, useMemo } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, onSnapshot, query, where, QueryConstraint, WhereFilterOp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, Query, Timestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Memoize os filtros para estabilizar a dependência do useEffect
  const filtersJSON = useMemo(() => JSON.stringify(initialFilters), [initialFilters]);

  useEffect(() => {
    setLoading(true); // Começa a carregar sempre que os filtros mudam

    const parsedFilters: FirestoreQueryFilter[] = JSON.parse(filtersJSON);
    
    // Valida se os filtros estão prontos para serem usados. Evita queries com valores undefined.
    const areFiltersValid = parsedFilters.every(f => f[2] !== undefined);
    if (!areFiltersValid) {
        setData([]);
        setLoading(false); // Se os filtros não estão prontos, para de carregar e retorna vazio.
        return;
    }
    
    const collectionRef = collection(firestoreDB, collectionName);
    const constraints: QueryConstraint[] = [];

    parsedFilters.forEach(filter => {
      if (filter[2] !== undefined && filter[2] !== null && filter[2] !== '') {
        constraints.push(where(filter[0], filter[1], filter[2]));
      }
    });

    if (initialSort) {
      constraints.push(orderBy(initialSort));
    }

    const q: Query = query(collectionRef, ...constraints);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dataFromFirestore = querySnapshot.docs.map(doc => {
        return { id: doc.id, ...doc.data() } as T;
      });
      setData(dataFromFirestore);
      setLoading(false); // Termina de carregar APÓS os dados serem definidos.
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: collectionRef.path,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      console.error(`Erro ao buscar coleção '${collectionName}': `, error);
      setData([]);
      setLoading(false);
    });

    return () => {
        unsubscribe();
    }
  }, [collectionName, initialSort, filtersJSON]);

  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
      const collectionRef = collection(firestoreDB, collectionName);
      try {
        const docRef = await addDoc(collectionRef, {
            ...newData,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error: any) {
        const permissionError = new FirestorePermissionError({
            path: collectionRef.path,
            operation: 'create',
            requestResourceData: newData
        });
        errorEmitter.emit('permission-error', permissionError);
        return null;
      }
  };

  const updateDocument = (id: string, updatedData: Partial<T>) => {
      const docRef = doc(firestoreDB, collectionName, id);
      updateDoc(docRef, updatedData)
        .catch((error) => {
             const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: updatedData
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const deleteDocument = async (id: string) => {
      const docRef = doc(firestoreDB, collectionName, id);
      try {
          await deleteDoc(docRef);
      } catch (error) {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
  };

  return {
    data,
    loading,
    addDocument,
    updateDocument,
    deleteDocument
  };
}
