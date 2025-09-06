// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { db as dexieDB } from '@/lib/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, QueryConstraint, WhereFilterOp } from 'firebase/firestore';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [isOnline, setIsOnline] = useState(true);
  const [firestoreData, setFirestoreData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Determina a tabela Dexie com base no nome da coleção
  const dexieTable = (dexieDB as any)[collectionName];

  // Observa os dados do Dexie
  const dexieData = useLiveQuery(() => {
    if (!dexieTable || isOnline) return [];
    
    // Aplica filtros e ordenação ao Dexie (simples)
    // Nota: A filtragem complexa no Dexie pode exigir índices mais avançados.
    let query = dexieTable;
    // Adicionar lógica de filtro do dexie se necessário
    return query.toArray();
  }, [collectionName, isOnline], []);


  useEffect(() => {
    const updateOnlineStatus = () => {
        setIsOnline(navigator.onLine);
    };
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Se estivermos online, busca do Firestore
    if (isOnline) {
      setLoading(true);
      let q: any = collection(firestoreDB, collectionName);
      const constraints: QueryConstraint[] = [];

      initialFilters.forEach(filter => {
          if (filter[2] !== undefined && filter[2] !== null && filter[2] !== '') {
             constraints.push(where(filter[0], filter[1], filter[2]));
          }
      });

      if (initialSort) {
          constraints.push(orderBy(initialSort));
      }
      
      if (constraints.length > 0) {
          q = query(q, ...constraints);
      }
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const dataFromFirestore = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as T));

        setFirestoreData(dataFromFirestore);
        setLoading(false);

      }, (error) => {
        console.error(`Error fetching collection '${collectionName}' from Firestore: `, error);
        setLoading(false);
      });

      return () => {
        unsubscribe();
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      }
    } else {
        // Se offline, já estamos usando o dexieData do useLiveQuery
        setLoading(false);
    }
  }, [collectionName, initialSort, JSON.stringify(initialFilters), isOnline]);


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
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const data = isOnline ? firestoreData : (dexieData as T[] | undefined) ?? [];
  
  return { data, loading: loading && isOnline, addDocument, updateDocument, deleteDocument };
}
