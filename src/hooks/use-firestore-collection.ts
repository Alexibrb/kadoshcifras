
// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, Query, WhereFilterOp } from 'firebase/firestore';
import type { Song } from '@/types';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Se um filtro estiver vazio (por exemplo, aguardando o ID do usuário), não execute a query.
    // Isso previne um erro do Firestore por tentar usar um valor `undefined` em `where`.
    if (initialFilters.some(f => f[2] === undefined || f[2] === null)) {
      setLoading(false);
      setData([]); // Garante que dados antigos não sejam mostrados
      return;
    }

    let q: Query = collection(db, collectionName);
    
    initialFilters.forEach(filter => {
      // Ignora filtros com valor `false` ou vazio para evitar queries desnecessárias
      if (filter[2]) {
         q = query(q, where(...filter));
      }
    });

    if (initialSort) {
      q = query(q, orderBy(initialSort));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const collectionData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));
      setData(collectionData);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching collection '${collectionName}': `, error);
      // Em caso de erro de permissão, é melhor retornar uma lista vazia do que dados antigos.
      setData([]);
      setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, initialSort, JSON.stringify(initialFilters)]);

  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
    try {
      // Remove campos nulos ou indefinidos antes de salvar
      const cleanedData = Object.fromEntries(
        Object.entries(newData).filter(([_, v]) => v != null && v !== '')
      );

      const docRef = await addDoc(collection(db, collectionName), {
        ...cleanedData,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding document: ", error);
      return null;
    }
  };

  const updateDocument = async (id: string, updatedData: Partial<T>) => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, updatedData);
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  return { data, loading, addDocument, updateDocument, deleteDocument };
}
