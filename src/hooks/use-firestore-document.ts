
// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, getDoc } from 'firebase/firestore';
import { db as dexieDB } from '@/lib/dexie';
import { useLiveQuery } from 'dexie-react-hooks';

export function useFirestoreDocument<T extends { id: string }>(collectionName: string, docId: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Monitora o status da conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);
    }
    
    return () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        }
    };
  }, []);

  // Hook para buscar dados do Dexie (funciona sempre, offline ou online)
  const dexieData = useLiveQuery(async () => {
    if (!docId) return null;
    // @ts-ignore
    const table = dexieDB[collectionName];
    if (!table) return null;
    
    const item = await table.get(docId);
    return item;
  }, [collectionName, docId]);

  useEffect(() => {
    if (!docId) {
        setData(null);
        setLoading(false);
        return;
    }
    
    // Se estiver offline, os dados do dexieData já serão usados.
    if (!isOnline) {
        if (dexieData !== undefined) {
            setData(dexieData);
            setLoading(false);
        }
        return;
    }
    
    // Se estiver online, usamos o Firestore como fonte da verdade
    const docRef = doc(firestoreDB, collectionName, docId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const firestoreData = { id: docSnap.id, ...docSnap.data() } as T;
            setData(firestoreData); // Atualiza o estado com os dados frescos do Firestore
        } else {
            setData(null);
        }
        setLoading(false);
    }, (error) => {
        console.error(`Error fetching document '${docId}' from Firestore: `, error);
        // Em caso de erro no Firestore, tenta usar o Dexie como fallback
        if (dexieData !== undefined) {
            setData(dexieData);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, docId, isOnline, dexieData]);
  
  const updateDocument = useCallback(async (updatedData: Partial<T>) => {
    if (!docId) return;
    try {
      const docRef = doc(firestoreDB, collectionName, docId);
      await updateDoc(docRef, updatedData as any);
    } catch (error) {
      console.error(`Error updating document in '${collectionName}': `, error);
    }
  }, [collectionName, docId]);

  return { data, loading, updateDocument };
}
