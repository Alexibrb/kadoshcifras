// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, QueryConstraint, WhereFilterOp } from 'firebase/firestore';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let q: any = collection(db, collectionName);
    const constraints: QueryConstraint[] = [];

    initialFilters.forEach(filter => {
        if (filter[2] !== undefined && filter[2] !== null && filter[2] !== '') {
           constraints.push(where(filter[0], filter[1], filter[2]));
        }
    });

    if (initialSort) {
        constraints.push(orderBy(initialSort));
    }
    
    if (constraints.length > 0) {
        q = query(q, ...constraints);
    }
    
    // onSnapshot will use the cache when offline
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dataFromFirestore = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));

      setData(dataFromFirestore);
      setLoading(false);

    }, (error) => {
      console.error(`Error fetching collection '${collectionName}' from Firestore: `, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, initialSort, JSON.stringify(initialFilters)]);


  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
    try {
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
      await updateDoc(docRef, updatedData as any);
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
