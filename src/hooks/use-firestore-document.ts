// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { db as dexieDB } from '@/lib/dexie';
import { doc, onSnapshot, updateDoc, DocumentData } from 'firebase/firestore';
import { useLiveQuery } from 'dexie-react-hooks';

export function useFirestoreDocument<T extends { id: string }>(
    collectionName: string, 
    docId: string
) {
  const [loading, setLoading] = useState(true);

  // 1. A fonte da verdade para a UI é SEMPRE o Dexie (banco de dados local).
  const localData = useLiveQuery(
    async () => {
      if (!docId) return null;
      const table = (dexieDB as any)[collectionName];
      if (!table) return null;
      
      const item = await table.get(docId);
      return item as T ?? null;
    },
    [collectionName, docId], // Dependências para o useLiveQuery
    null // Valor inicial
  );

  // 2. Efeito para ouvir o Firestore e manter o Dexie atualizado.
  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }
    
    // Só executa no navegador e quando online
    if (typeof window === 'undefined' || !navigator.onLine) {
        setLoading(false); // Se offline, paramos de carregar, confiando nos dados do Dexie
        return;
    }
    
    setLoading(true);
    const docRef = doc(firestoreDB, collectionName, docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = { id: docSnap.id, ...docSnap.data() } as T;
        
        // Sincroniza o dado recebido com o Dexie.
        const table = (dexieDB as any)[collectionName];
        if (table) {
          table.put(firestoreData).catch((err: any) => {
            console.error(`Erro ao atualizar documento em Dexie para ${collectionName}:`, err);
          });
        }
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
      
      // Atualiza o Dexie também para uma UI mais responsiva
      const table = (dexieDB as any)[collectionName];
      if(table) {
        await table.update(docId, updatedData);
      }
    } catch (error) {
      console.error(`Error updating document in '${collectionName}': `, error);
    }
  }, [collectionName, docId]);
  
  // A UI sempre usa os dados do Dexie (localData).
  // O estado de loading é uma combinação do carregamento inicial do Firestore e da disponibilidade do localData.
  return { 
      data: localData, 
      loading: loading && !localData, 
      updateDocument 
  };
}
