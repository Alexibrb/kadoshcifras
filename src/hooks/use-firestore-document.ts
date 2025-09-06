// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
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
    
    const docRef = doc(db, collectionName, docId);

    // onSnapshot will use the cache when offline
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const dataFromFirestore = { id: docSnap.id, ...docSnap.data() } as T;
            setData(dataFromFirestore);
        } else {
            console.log(`Documento não encontrado no Firestore: ${collectionName}/${docId}`);
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
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, updatedData as any);
    } catch (error) {
      console.error(`Error updating document in '${collectionName}': `, error);
    }
  }, [collectionName, docId]);
  
  return { data, loading, updateDocument };
}
