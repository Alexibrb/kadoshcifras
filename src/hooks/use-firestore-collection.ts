// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, onSnapshot, query, where, QueryConstraint, WhereFilterOp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, Query, Timestamp } from 'firebase/firestore';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log(`[Firestore] Montando listener para coleção: ${collectionName}`);

    // Valida se os filtros estão prontos para serem usados. Evita queries com valores undefined.
    const areFiltersValid = initialFilters.every(f => f[2] !== undefined);
     if (!areFiltersValid) {
        // Se os filtros não estão prontos (ex: appUser ainda não carregou),
        // definimos loading como false para não travar a UI, mas retornamos dados vazios.
        setLoading(false);
        setData([]);
        return;
    }
    
    const collectionRef = collection(firestoreDB, collectionName);
    const constraints: QueryConstraint[] = [];

    initialFilters.forEach(filter => {
      // Garante que filtros com valores vazios ou nulos não sejam adicionados à query.
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
      setLoading(false);
    }, (error) => {
      console.error(`Erro ao buscar coleção '${collectionName}': `, error);
      setLoading(false);
    });

    return () => {
        console.log(`[Firestore] Desmontando listener para coleção: ${collectionName}`);
        unsubscribe();
    }
  // A dependência JSON.stringify é uma forma de garantir que o hook reaja a mudanças nos filtros.
  }, [collectionName, initialSort, JSON.stringify(initialFilters)]);

  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
      try {
        const docRef = await addDoc(collection(firestoreDB, collectionName), {
            ...newData,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error) {
        console.error(`Erro ao adicionar documento a '${collectionName}': `, error);
        return null;
      }
  };

  const updateDocument = async (id: string, updatedData: Partial<T>) => {
      try {
          const docRef = doc(firestoreDB, collectionName, id);
          await updateDoc(docRef, updatedData);
      } catch (error) {
          console.error(`Erro ao atualizar documento em '${collectionName}': `, error);
      }
  };

  const deleteDocument = async (id: string) => {
      try {
          const docRef = doc(firestoreDB, collectionName, id);
          await deleteDoc(docRef);
      } catch (error) {
          console.error(`Erro ao deletar documento de '${collectionName}': `, error);
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
