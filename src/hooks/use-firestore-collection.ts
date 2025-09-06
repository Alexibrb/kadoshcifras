
// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { db as dexieDB } from '@/lib/dexie';
import { collection, onSnapshot, query, where, QueryConstraint, WhereFilterOp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useLiveQuery } from 'dexie-react-hooks';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string, 
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [loading, setLoading] = useState(true);

  const localData = useLiveQuery(
    async () => {
      const table = (dexieDB as any)[collectionName];
      if (!table) return [];

      // Garante que TODOS os filtros sejam válidos antes de prosseguir.
      const areFiltersValid = initialFilters.every(f => f[2] !== undefined && f[2] !== null);
      if (!areFiltersValid) {
          return []; // Retorna vazio se algum filtro for inválido, evitando a consulta
      }

      let query = table;
      
      const validFilters = initialFilters.filter(f => f[2] !== '');

      if(validFilters.length > 0) {
        const filterObj: { [key: string]: any } = {};
        validFilters.forEach(f => {
            if(f[1] === '==') {
                filterObj[f[0]] = f[2];
            }
        })
        if (Object.keys(filterObj).length > 0) {
            query = query.where(filterObj);
        }
      }
      
      const items = await query.toArray();

      if (initialSort && items.length > 0 && items[0][initialSort]) {
        items.sort((a: any, b: any) => {
          if (a[initialSort] < b[initialSort]) return -1;
          if (a[initialSort] > b[initialSort]) return 1;
          return 0;
        });
      }

      return items as T[];
    },
    [collectionName, JSON.stringify(initialFilters), initialSort], 
    [] 
  );
  
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.onLine) {
        setLoading(false); 
        return;
    }
    
    setLoading(true);

    const collectionRef = collection(firestoreDB, collectionName);
    const constraints: QueryConstraint[] = [];
    
    initialFilters.forEach(filter => {
      if (filter[2] !== undefined && filter[2] !== null && filter[2] !== '') {
        constraints.push(where(filter[0], filter[1], filter[2]));
      }
    });

    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dataFromFirestore = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));

      const table = (dexieDB as any)[collectionName];
      if (table) {
        table.bulkPut(dataFromFirestore).catch((err: any) => {
          console.error(`Erro ao atualizar Dexie para ${collectionName}:`, err);
        });
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching collection '${collectionName}' from Firestore: `, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, initialSort, JSON.stringify(initialFilters)]);
  
  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
      try {
        const docRef = await addDoc(collection(firestoreDB, collectionName), {
            ...newData,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error) {
        console.error(`Error adding document to '${collectionName}': `, error);
        return null;
      }
  };

  const updateDocument = async (id: string, updatedData: Partial<T>) => {
      try {
          const docRef = doc(firestoreDB, collectionName, id);
          await updateDoc(docRef, updatedData);
      } catch (error) {
          console.error(`Error updating document in '${collectionName}': `, error);
      }
  };

  const deleteDocument = async (id: string) => {
      try {
          const docRef = doc(firestoreDB, collectionName, id);
          await deleteDoc(docRef);
      } catch (error) {
          console.error(`Error deleting document from '${collectionName}': `, error);
      }
  };
  
  return { 
    data: localData || [], 
    loading: loading && localData?.length === 0, 
    addDocument,
    updateDocument,
    deleteDocument
  };
}
