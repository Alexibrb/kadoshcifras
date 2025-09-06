// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { db as dexieDB } from '@/lib/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';


export function useFirestoreDocument<T extends { id: string }>(collectionName: string, docId: string) {
  const [isOnline, setIsOnline] = useState(true);
  const [firestoreData, setFirestoreData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  // Determina a tabela Dexie com base no nome da coleção
  const dexieTable = (dexieDB as any)[collectionName];

  // Observa o documento específico do Dexie
  const dexieData = useLiveQuery(() => {
    if (!dexieTable || isOnline || !docId) return null;
    return dexieTable.get(docId);
  }, [collectionName, docId, isOnline], null);
  
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    if (isOnline) {
        setLoading(true);
        if (!docId) {
            setFirestoreData(null);
            setLoading(false);
            return;
        }
        
        const docRef = doc(firestoreDB, collectionName, docId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const dataFromFirestore = { id: docSnap.id, ...docSnap.data() } as T;
                setFirestoreData(dataFromFirestore);
            } else {
                console.log(`Documento não encontrado no Firestore: ${collectionName}/${docId}`);
                setFirestoreData(null);
            }
            setLoading(false);
        }, (error) => {
            console.error(`Error fetching document '${docId}' from Firestore: `, error);
            setLoading(false);
        });

        return () => {
            unsubscribe();
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        }
    } else {
        setLoading(false);
    }
  }, [collectionName, docId, isOnline]);
  
  const updateDocument = useCallback(async (updatedData: Partial<T>) => {
    if (!docId) {
      console.error("ID do documento não fornecido para atualização.");
      return;
    }
    try {
      const docRef = doc(firestoreDB, collectionName, docId);
      await updateDoc(docRef, updatedData as any);
    } catch (error) {
      console.error(`Error updating document in '${collectionName}': `, error);
    }
  }, [collectionName, docId]);
  
  const data = isOnline ? firestoreData : (dexieData as T | null | undefined) ?? null;

  return { data, loading: loading && isOnline, updateDocument };
}
