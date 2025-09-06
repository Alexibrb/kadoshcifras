
// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';


export function useFirestoreDocument<T extends { id: string }>(collectionName: string, docId: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (!docId) {
        setData(null);
        setLoading(false);
        return;
    }
    
    const docRef = doc(firestoreDB, collectionName, docId);

    // onSnapshot lida com o cache offline automaticamente.
    // Se estiver offline, retornará dados do cache.
    // Se online, buscará do servidor e atualizará o cache.
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const firestoreData = { id: docSnap.id, ...docSnap.data() } as T;
            setData(firestoreData);
        } else {
            console.log(`Documento não encontrado: ${collectionName}/${docId}`);
            setData(null);
        }
        setLoading(false);
    }, (error) => {
        console.error(`Error fetching document '${docId}' from Firestore: `, error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, docId]);
  
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

  return { data, loading, updateDocument };
}
