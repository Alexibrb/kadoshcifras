// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect } from 'react';
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
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error(`Erro ao ler do localStorage: ${key}`, error);
        return null;
    }
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

  useEffect(() => {
    if (!docId) {
        setLoading(false);
        setData(null);
        return;
    }
    
    // 1. Tenta carregar o documento da coleção salva no localStorage.
    const collectionStorageKey = `collection_${collectionName}`;
    const localCollection = getDataFromLocalStorage<T[]>(collectionStorageKey);
    const docFromCollection = localCollection?.find(doc => doc.id === docId) || null;

    if (docFromCollection) {
        setData(docFromCollection);
    }
    setLoading(!docFromCollection); // Só continua carregando se não encontrou nos dados da coleção

    // 2. Se estiver online, conecta-se ao Firestore para obter o documento mais recente.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
       setLoading(false);
       return;
    }

    const docRef = doc(firestoreDB, collectionName, docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        const convertedData = convertTimestamps(firestoreData);
        const finalData = { id: docSnap.id, ...convertedData } as T;
        
        // 3. Atualiza o estado e o localStorage com os dados mais recentes.
        setData(finalData);

        // Atualiza a coleção inteira no localStorage para manter a consistência.
        const currentCollection = getDataFromLocalStorage<T[]>(collectionStorageKey) || [];
        const docIndex = currentCollection.findIndex(d => d.id === docId);
        if (docIndex > -1) {
            currentCollection[docIndex] = finalData;
        } else {
            currentCollection.push(finalData);
        }
        setDataToLocalStorage(collectionStorageKey, currentCollection);

      } else {
        setData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Erro ao buscar documento '${docId}': `, error);
      // Mantém os dados locais se a busca online falhar.
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, docId]);

  const updateDocument = async (updatedData: Partial<Omit<T, 'id'>>) => {
    if (!docId) {
      console.error("ID do documento não fornecido para atualização.");
      return;
    }
    try {
      const docRef = doc(firestoreDB, collectionName, docId);
      await updateDoc(docRef, updatedData as DocumentData);
    } catch (error) {
      console.error(`Erro ao atualizar documento em '${collectionName}': `, error);
    }
  };

  return {
      data,
      loading,
      updateDocument
  };
}
