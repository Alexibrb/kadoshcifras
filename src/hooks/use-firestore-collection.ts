
// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect, useMemo } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, Query, WhereFilterOp, getDocs, QueryConstraint } from 'firebase/firestore';
import { db as dexieDB } from '@/lib/dexie';
import { useLiveQuery } from 'dexie-react-hooks';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Monitora o status da conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);
    }
    
    return () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        }
    };
  }, []);

  // Hook para buscar dados do Dexie (funciona sempre, offline ou online)
  const dexieData = useLiveQuery(async () => {
    // @ts-ignore
    const table = dexieDB[collectionName];
    if (!table) return [];

    let collection = table;
    const allItems = await collection.toArray();

    let filtered = allItems;
    initialFilters.forEach(filter => {
      const [field, op, value] = filter;
       // Ignora filtros com valores indefinidos ou vazios que podem vir de estados iniciais
      if (value === undefined || value === '' || value === null) return;
      
      filtered = filtered.filter((item: any) => {
          if (!item.hasOwnProperty(field)) return false;
          if (op === '==') return item[field] === value;
          // Adicione outros operadores de filtro conforme necessário
          return true;
      });
    });

    if (initialSort) {
      filtered.sort((a: any, b: any) => {
        if (a[initialSort] < b[initialSort]) return -1;
        if (a[initialSort] > b[initialSort]) return 1;
        return 0;
      });
    }
    
    return filtered;

  }, [collectionName, initialSort, JSON.stringify(initialFilters)]);


  useEffect(() => {
    // Se estivermos offline, os dados do dexieData já serão usados.
    // O loading se torna falso quando dexieData é definido.
    if (!isOnline) {
      if (dexieData !== undefined) {
        setData(dexieData as T[]);
        setLoading(false);
      }
      return;
    }

    // Se estiver online, usamos o Firestore como fonte da verdade
    let q: Query = collection(firestoreDB, collectionName);
    const constraints: QueryConstraint[] = [];
    if (initialSort) {
        constraints.push(orderBy(initialSort));
    }
    initialFilters.forEach(filter => {
        // Apenas aplica filtros válidos
        if (filter[2] !== undefined && filter[2] !== null && filter[2] !== '') {
           constraints.push(where(filter[0], filter[1], filter[2]));
        }
    });

    if (constraints.length > 0) {
        q = query(q, ...constraints);
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const firestoreData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));

      setData(firestoreData); // Atualiza o estado com os dados frescos do Firestore

      setLoading(false);
    }, (error) => {
      console.error(`Error fetching collection '${collectionName}' from Firestore: `, error);
      // Em caso de erro no Firestore (ex: permissão), usa o Dexie como fallback
      if (dexieData !== undefined) {
          setData(dexieData as T[]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, initialSort, JSON.stringify(initialFilters), isOnline, dexieData]);


  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
    try {
      const cleanedData = Object.fromEntries(
        Object.entries(newData).filter(([_, v]) => v != null && v !== '')
      );
      const docRef = await addDoc(collection(firestoreDB, collectionName), {
        ...cleanedData,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding document: ", error);
      return null;
    }
  };

  const updateDocument = async (id: string, updatedData: Partial<T>) => {
    try {
      const docRef = doc(firestoreDB, collectionName, id);
      await updateDoc(docRef, updatedData as any);
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const docRef = doc(firestoreDB, collectionName, id);
      await deleteDoc(docRef);
       // Também remove do Dexie imediatamente
      // @ts-ignore
      await dexieDB[collectionName].delete(id);
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  return { data, loading, addDocument, updateDocument, deleteDocument };
}
