// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, DocumentData } from 'firebase/firestore';

function getDataFromLocalStorage<T>(collectionName: string, docId: string): T | null {
    if (typeof window === 'undefined' || !docId) return null;
    const key = `${collectionName}_doc_${docId}`; // Nova convenção de chave
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error(`Error reading ${key} from localStorage`, error);
        return null;
    }
}

function setDataToLocalStorage<T>(collectionName: string, docId: string, data: T) {
    if (typeof window === 'undefined' || !docId) return;
    const key = `${collectionName}_doc_${docId}`; // Nova convenção de chave
    try {
        window.localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error writing ${key} to localStorage`, error);
    }
}


export function useFirestoreDocument<T extends { id: string }>(
    collectionName: string, 
    docId: string
) {
  const [data, setData] = useState<T | null>(() => getDataFromLocalStorage<T>(collectionName, docId));
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!docId) {
        setLoading(false);
        setData(null);
        return;
    }

    if (!isOnline) {
      setData(getDataFromLocalStorage<T>(collectionName, docId));
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const docRef = doc(firestoreDB, collectionName, docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = { id: docSnap.id, ...docSnap.data() } as T;
        setData(firestoreData);
        setDataToLocalStorage<T>(collectionName, docId, firestoreData);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching document '${docId}' from Firestore: `, error);
      setData(getDataFromLocalStorage<T>(collectionName, docId)); // Fallback
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, docId, isOnline]);

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
