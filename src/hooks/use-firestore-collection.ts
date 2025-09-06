
// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, Query, WhereFilterOp, getDocs } from 'firebase/firestore';
import { db as dexieDB } from '@/lib/dexie';
import { useLiveQuery } from 'dexie-react-hooks';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = []
) {
  const liveData = useLiveQuery(async () => {
    // @ts-ignore
    const table = dexieDB[collectionName];
    if (!table) return [];

    let collection = table;
    
    // Dexie doesn't support complex 'where' clauses like Firestore in its basic form.
    // Filtering will be done client-side for simplicity here.
    // For more complex scenarios, you might need to use Dexie's `filter()` method.
    const allItems = await collection.toArray();

    let filtered = allItems;

    initialFilters.forEach(filter => {
      const [field, op, value] = filter;
      if (value) {
        filtered = filtered.filter((item: any) => {
          if (op === '==') return item[field] === value;
          // Add other operators as needed
          return true;
        });
      }
    });

    if (initialSort) {
      filtered.sort((a: any, b: any) => {
        if (a[initialSort] < b[initialSort]) return -1;
        if (a[initialSort] > b[initialSort]) return 1;
        return 0;
      });
    }
    
    return filtered;

  }, [collectionName, initialSort, JSON.stringify(initialFilters)]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (liveData !== undefined) {
      setLoading(false);
    }
  }, [liveData]);
  
  // This hook now primarily reads from Dexie. The write operations still go to Firestore.
  // The sync service is responsible for populating Dexie from Firestore.

  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
    try {
      const cleanedData = Object.fromEntries(
        Object.entries(newData).filter(([_, v]) => v != null && v !== '')
      );
      const docRef = await addDoc(collection(firestoreDB, collectionName), {
        ...cleanedData,
        createdAt: serverTimestamp(),
      });
      // After adding to Firestore, you might want to re-sync or just add to Dexie locally
      // @ts-ignore
      await dexieDB[collectionName].add({ ...cleanedData, id: docRef.id });
      return docRef.id;
    } catch (error) {
      console.error("Error adding document: ", error);
      return null;
    }
  };

  const updateDocument = async (id: string, updatedData: Partial<T>) => {
    try {
      const docRef = doc(firestoreDB, collectionName, id);
      await updateDoc(docRef, updatedData);
      // @ts-ignore
      await dexieDB[collectionName].update(id, updatedData);
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const docRef = doc(firestoreDB, collectionName, id);
      await deleteDoc(docRef);
       // @ts-ignore
      await dexieDB[collectionName].delete(id);
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  return { data: liveData || [], loading, addDocument, updateDocument, deleteDocument };
}
