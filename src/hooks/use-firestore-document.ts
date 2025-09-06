// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, Timestamp } from 'firebase/firestore';

// Helper para converter Timestamps do Firestore para strings ISO, que são serializáveis.
const convertTimestamps = (data: any) => {
    if (!data) return data;
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            newObj[key] = data[key].toDate().toISOString();
        } else {
            newObj[key] = data[key];
        }
    }
    return newObj;
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

    // A lógica agora confia no cache do Firestore.
    // `onSnapshot` obterá dados do cache primeiro se estiver offline,
    // e depois obterá dados em tempo real do servidor se estiver online.
    console.log(`[Firestore] Montando listener para documento: ${collectionName}/${docId}`);
    
    const docRef = doc(firestoreDB, collectionName, docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        // Converte timestamps para um formato consistente
        const convertedData = convertTimestamps(firestoreData);
        const finalData = { id: docSnap.id, ...convertedData } as T;
        
        setData(finalData);

        if(docSnap.metadata.fromCache) {
          console.log(`[Firestore Cache] Dados para '${collectionName}/${docId}' vieram do cache.`);
        } else {
          console.log(`[Firestore Server] Dados para '${collectionName}/${docId}' vieram do servidor.`);
        }
      } else {
        setData(null);
        console.warn(`[Firestore] Documento não encontrado: ${collectionName}/${docId}`);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Erro ao buscar documento '${docId}': `, error);
      setLoading(false);
    });

    return () => {
      console.log(`[Firestore] Desmontando listener para documento: ${collectionName}/${docId}`);
      unsubscribe();
    }
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
