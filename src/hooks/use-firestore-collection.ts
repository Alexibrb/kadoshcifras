// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, onSnapshot, query, where, QueryConstraint, WhereFilterOp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, Query, Timestamp } from 'firebase/firestore';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

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
        console.error(`Falha ao salvar a coleção '${key}' no localStorage. O armazenamento pode estar cheio.`, e);
        // Opcional: Adicionar um toast para o usuário aqui
    }
};

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const storageKey = `collection_${collectionName}`;

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
    if (!isOnline) {
      console.log(`[Offline] Carregando '${collectionName}' do localStorage.`);
      const localData = getDataFromLocalStorage<T[]>(storageKey);
      if (localData) {
        setData(localData);
      }
      setLoading(false);
      return;
    }

    const areFiltersValid = initialFilters.every(f => f[2] !== undefined && f[2] !== null);
    if (!areFiltersValid) {
        setLoading(false);
        setData([]);
        return;
    }

    setLoading(true);

    const collectionRef = collection(firestoreDB, collectionName);
    const constraints: QueryConstraint[] = [];

    initialFilters.forEach(filter => {
      if (filter[2] !== undefined && filter[2] !== null && filter[2] !== '') {
        constraints.push(where(filter[0], filter[1], filter[2]));
      }
    });

    if (initialSort) {
      constraints.push(orderBy(initialSort));
    }

    const q: Query = query(collectionRef, ...constraints);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dataFromFirestore = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        const convertedData = convertTimestamps(docData);
        return { id: doc.id, ...convertedData } as T;
      });
      
      setData(dataFromFirestore);
      setDataToLocalStorage(storageKey, dataFromFirestore); // Salva no cache
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching collection '${collectionName}' from Firestore: `, error);
      // Em caso de erro, tenta carregar do cache local
      const localData = getDataFromLocalStorage<T[]>(storageKey);
      if (localData) {
          setData(localData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, initialSort, JSON.stringify(initialFilters), isOnline]);

  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
      try {
        const docRef = await addDoc(collection(firestoreDB, collectionName), {
            ...newData,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error) {
        console.error(`Error adding document to '${collectionName}': `, error);
        return null;
      }
  };

  const updateDocument = async (id: string, updatedData: Partial<T>) => {
      try {
          const docRef = doc(firestoreDB, collectionName, id);
          await updateDoc(docRef, updatedData);
      } catch (error) {
          console.error(`Error updating document in '${collectionName}': `, error);
      }
  };

  const deleteDocument = async (id: string) => {
      try {
          const docRef = doc(firestoreDB, collectionName, id);
          await deleteDoc(docRef);
      } catch (error) {
          console.error(`Error deleting document from '${collectionName}': `, error);
      }
  };

  return {
    data,
    loading,
    addDocument,
    updateDocument,
    deleteDocument
  };
}
