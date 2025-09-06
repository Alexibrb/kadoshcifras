// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, onSnapshot, query, where, QueryConstraint, WhereFilterOp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, Query } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

const convertTimestamps = (data: any) => {
    if (data?.createdAt instanceof Timestamp) {
        return { ...data, createdAt: data.createdAt.toDate().toISOString() };
    }
    return data;
};

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const areFiltersValid = initialFilters.every(f => f[2] !== undefined && f[2] !== null);
    if (!areFiltersValid) {
        setLoading(false);
        setData([]);
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

    // A ordenação agora é feita pelo Firestore
    if (initialSort) {
      constraints.push(orderBy(initialSort));
    }

    const q: Query = query(collectionRef, ...constraints);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dataFromFirestore = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        const convertedData = convertTimestamps(docData);
        return { id: doc.id, ...convertedData } as T;
      });
      
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
    data,
    loading,
    addDocument,
    updateDocument,
    deleteDocument
  };
}