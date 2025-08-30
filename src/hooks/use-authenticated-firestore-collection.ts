
// src/hooks/use-authenticated-firestore-collection.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, Query, WhereFilterOp, or, QueryConstraint } from 'firebase/firestore';
import { useAuth } from './use-auth'; // Importa o hook de autenticação

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

/**
 * Um hook que interage com uma coleção do Firestore, mas apenas se o usuário
 * estiver autenticado e aprovado (appUser.isApproved === true).
 * Isso previne erros de permissão do Firestore ao tentar ler ou escrever dados
 * em coleções protegidas.
 * Aceita uma query completa do Firestore para flexibilidade máxima.
 */
export function useAuthenticatedFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  firestoreQuery?: Query | null // Aceita uma query completa ou nula
) {
  const { appUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Se a query explícita for nula (indicando que ainda estamos aguardando dependências),
    // ou se o usuário não estiver aprovado, não fazemos nada.
    if (authLoading || !appUser?.isApproved || firestoreQuery === null) {
      setLoading(false);
      // Limpa os dados antigos se o usuário for deslogado ou se a query se tornar nula
      if ((!authLoading && !appUser) || firestoreQuery === null) {
        setData([]);
      }
      return;
    }

    // Usa a query passada diretamente se ela existir.
    // Caso contrário, constrói uma query simples para a coleção inteira.
    const q = firestoreQuery ?? query(collection(db, collectionName));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const collectionData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));
      setData(collectionData);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching collection '${collectionName}': `, error);
      setData([]); // Limpa os dados em caso de erro de permissão
      setLoading(false);
    });

    return () => unsubscribe();
  // A dependência de appUser e da query (se passada) garante a re-execução correta.
  }, [collectionName, authLoading, appUser, firestoreQuery]);

  const addDocument = useCallback(async (newData: Omit<T, 'id' | 'createdAt'>) => {
    // Previne a escrita se o usuário não for aprovado.
    if (!appUser?.isApproved) {
        console.error("Operação não permitida: Usuário não aprovado.");
        return null;
    }
    try {
      const cleanedData = Object.fromEntries(
        Object.entries(newData).filter(([_, v]) => v != null && v !== '')
      );
      const docRef = await addDoc(collection(db, collectionName), {
        ...cleanedData,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to '${collectionName}': `, error);
      return null;
    }
  }, [collectionName, appUser]);

  const updateDocument = useCallback(async (id: string, updatedData: Partial<T>) => {
    if (!appUser?.isApproved) {
        console.error("Operação não permitida: Usuário não aprovado.");
        return;
    }
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, updatedData);
    } catch (error) {
      console.error(`Error updating document in '${collectionName}': `, error);
    }
  }, [collectionName, appUser]);

  const deleteDocument = useCallback(async (id: string) => {
     if (!appUser?.isApproved) {
        console.error("Operação não permitida: Usuário não aprovado.");
        return;
    }
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from '${collectionName}': `, error);
    }
  }, [collectionName, appUser]);

  return { data, loading: authLoading || loading, addDocument, updateDocument, deleteDocument };
}
