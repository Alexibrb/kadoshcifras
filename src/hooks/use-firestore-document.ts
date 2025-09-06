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

// Helper para obter dados do localStorage
const getDataFromLocalStorage = <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
};

// Helper para salvar dados no localStorage
const setDataToLocalStorage = (key: string, data: any) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Falha ao salvar o documento '${key}' no localStorage. O armazenamento pode estar cheio.`, e);
    }
};


export function useFirestoreDocument<T extends { id: string }>(
    collectionName: string,
    docId: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const storageKey = `document_${collectionName}_${docId}`;

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
      console.log(`[Offline] Carregando documento '${docId}' do cache da coleção.`);
      const collectionData = getDataFromLocalStorage<T[]>(`collection_${collectionName}`);
      if (collectionData) {
        const docData = collectionData.find(doc => doc.id === docId);
        if (docData) {
            setData(docData);
        } else {
            // Tenta como fallback buscar o documento individual
            const individualDocData = getDataFromLocalStorage<T>(storageKey);
            setData(individualDocData);
        }
      } else {
         // Fallback final para documento individual se a coleção não estiver no cache
        const individualDocData = getDataFromLocalStorage<T>(storageKey);
        setData(individualDocData);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(firestoreDB, collectionName, docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        const convertedData = convertTimestamps(firestoreData);
        const finalData = { id: docSnap.id, ...convertedData } as T;
        setData(finalData);
        // Salva o documento individualmente no cache para acesso rápido e atualizações
        setDataToLocalStorage(storageKey, finalData); 
      } else {
        setData(null);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(storageKey); // Remove se não existe mais
        }
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching document '${docId}' from Firestore: `, error);
      // Fallback para o cache em caso de erro de fetch.
      const localData = getDataFromLocalStorage<T>(storageKey);
       if (localData) {
          setData(localData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, docId, isOnline, storageKey]);

  const updateDocument = useCallback(async (updatedData: Partial<Omit<T, 'id'>>) => {
    if (!docId) {
      console.error("ID do documento não fornecido para atualização.");
      return;
    }
    if (!isOnline) {
      console.warn("Offline: A atualização será enviada quando a conexão for restaurada.");
      // O Firestore lida com a fila de atualizações offline automaticamente.
    }
    try {
      const docRef = doc(firestoreDB, collectionName, docId);
      await updateDoc(docRef, updatedData as DocumentData);
    } catch (error) {
      console.error(`Error updating document in '${collectionName}': `, error);
    }
  }, [collectionName, docId, isOnline]);

  return {
      data,
      loading,
      updateDocument
  };
}
