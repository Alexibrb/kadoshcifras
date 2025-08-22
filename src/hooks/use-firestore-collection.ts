// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, Query, WhereFilterOp } from 'firebase/firestore';
import type { Song } from '@/types';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort: string = 'title',
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q: Query = collection(db, collectionName);
    
    initialFilters.forEach(filter => {
      q = query(q, where(...filter));
    });

    q = query(q, orderBy(initialSort));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const collectionData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));
      setData(collectionData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching collection: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, initialSort, JSON.stringify(initialFilters)]);

  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, collectionName), {
        ...newData,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding document: ", error);
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
