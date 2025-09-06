// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, Timestamp } from 'firebase/firestore';

const convertTimestamps = (data: any) => {
    if (data?.createdAt instanceof Timestamp) {
        return { ...data, createdAt: data.createdAt.toDate().toISOString() };
    }
    return data;
};

export function useFirestoreDocument<T extends { id: string }>(
    collectionName: string,
    docId: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) {
        setLoading(false);
        setData(null);
        return;
    }

    setLoading(true);
    const docRef = doc(firestoreDB, collectionName, docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        const convertedData = convertTimestamps(firestoreData);
        setData({ id: docSnap.id, ...convertedData } as T);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching document '${docId}' from Firestore: `, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, docId]);

  const updateDocument = useCallback(async (updatedData: Partial<Omit<T, 'id'>>) => {
    if (!docId) {
      console.error("ID do documento não fornecido para atualização.");
      return;
    }
    try {
      const docRef = doc(firestoreDB, collectionName, docId);
      await updateDoc(docRef, updatedData as DocumentData);
    } catch (error) {
      console.error(`Error updating document in '${collectionName}': `, error);
    }
  }, [collectionName, docId]);

  return {
      data,
      loading,
      updateDocument
  };
}