
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

  // Observa os dados do Dexie incondicionalmente.
  const dexieData = useLiveQuery(() => {
    if (!dexieTable) return [];
    
    // A lógica de filtragem/ordenação no Dexie pode ser adicionada aqui se necessário.
    // Por enquanto, apenas pegamos todos os dados da tabela.
    return dexieTable.toArray();
  }, [collectionName], []);


  useEffect(() => {
    // Monitora o status da conexão
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Sempre tenta buscar do Firestore. O SDK do Firestore gerenciará o cache,
    // mas nossa lógica offline-first confiará no Dexie quando a conexão cair.
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
      // Em caso de erro (ex: offline), paramos o carregamento. Os dados do Dexie serão usados.
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    }
  }, [collectionName, initialSort, JSON.stringify(initialFilters)]);


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

  // A fonte da verdade é o Firestore se estivermos online e houver dados.
  // Caso contrário, usamos os dados do Dexie.
  const data = isOnline ? firestoreData : (dexieData as T[] | undefined) ?? [];
  
  return { data, loading: loading && isOnline, addDocument, updateDocument, deleteDocument };
}
