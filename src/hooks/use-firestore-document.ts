// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, DocumentData } from 'firebase/firestore';

export function useFirestoreDocument<T extends { id: string }>(
    collectionName: string,
    docId: string | undefined | null
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Se o docId não for fornecido, não faz nada.
    if (!docId) {
        setLoading(false);
        setData(null);
        return;
    }

    // Esta versão do hook confia 100% no cache do Firestore (IndexedDB).
    // `onSnapshot` obterá dados do cache primeiro se estiver offline,
    // e depois obterá dados em tempo real do servidor se estiver online.
    console.log(`[Firestore] Montando listener para documento: ${collectionName}/${docId}`);
    
    const docRef = doc(firestoreDB, collectionName, docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        const finalData = { id: docSnap.id, ...firestoreData } as T;
        setData(finalData);

        if (docSnap.metadata.fromCache) {
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
