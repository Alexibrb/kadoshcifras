
// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, DocumentData } from 'firebase/firestore';

export function useFirestoreDocument<T extends { id: string }>(collectionName: string, docId: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }
    
    const docRef = doc(db, collectionName, docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData({ id: docSnap.id, ...docSnap.data() } as T);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching document: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, docId]);

  const updateDocument = useCallback(async (updatedData: Partial<T>) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, updatedData);
    } catch (error) {
      console.error(`Error updating document in '${collectionName}': `, error);
    }
  }, [collectionName, docId]);

  return { data, loading, updateDocument };
}
