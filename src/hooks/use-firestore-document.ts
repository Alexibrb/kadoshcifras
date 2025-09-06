
// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, getDoc } from 'firebase/firestore';
import { db as dexieDB } from '@/lib/dexie';
import { useLiveQuery } from 'dexie-react-hooks';

export function useFirestoreDocument<T extends { id: string }>(collectionName: string, docId: string) {
  const liveData = useLiveQuery(async () => {
    if (!docId) return null;
     // @ts-ignore
    const table = dexieDB[collectionName];
    if (!table) return null;
    
    const item = await table.get(docId);
    return item;
  }, [collectionName, docId], null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A simple check to see if Dexie has loaded the data.
    if (liveData !== undefined) {
      setLoading(false);
    }
  }, [liveData]);
  
  const updateDocument = useCallback(async (updatedData: Partial<T>) => {
    if (!docId) return;
    try {
      const docRef = doc(firestoreDB, collectionName, docId);
      await updateDoc(docRef, updatedData);
       // @ts-ignore
      await dexieDB[collectionName].update(docId, updatedData);
    } catch (error) {
      console.error(`Error updating document in '${collectionName}': `, error);
    }
  }, [collectionName, docId]);

  return { data: liveData, loading, updateDocument };
}
