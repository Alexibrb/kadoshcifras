// src/hooks/use-firestore-document.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

    const docRef = doc(firestoreDB, collectionName, docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        const finalData = { id: docSnap.id, ...firestoreData } as T;
        setData(finalData);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'get',
      });
      errorEmitter.emit('permission-error', permissionError);
      console.error(`Erro ao buscar documento '${docId}': `, error);
      setData(null);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    }
  }, [collectionName, docId]);

  const updateDocument = async (updatedData: Partial<Omit<T, 'id'>>) => {
    if (!docId) {
      console.error("ID do documento não fornecido para atualização.");
      return;
    }
    const docRef = doc(firestoreDB, collectionName, docId);
    updateDoc(docRef, updatedData as DocumentData)
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return {
      data,
      loading,
      updateDocument
  };
}
