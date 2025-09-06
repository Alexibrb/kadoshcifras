// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, onSnapshot, query, where, QueryConstraint, WhereFilterOp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, Query, Timestamp } from 'firebase/firestore';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

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

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A lógica agora confia no cache do Firestore.
    // `onSnapshot` obterá dados do cache primeiro se estiver offline,
    // e depois obterá dados em tempo real do servidor se estiver online.
    console.log(`[Firestore] Montando listener para coleção: ${collectionName}`);

    const areFiltersValid = initialFilters.every(f => f[2] !== undefined && f[2] !== null);
    if (!areFiltersValid) {
        setLoading(false);
        setData([]);
        return;
    }

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
        // Converte timestamps para um formato consistente
        const convertedData = convertTimestamps(docData);
        return { id: doc.id, ...convertedData } as T;
      });
      
      setData(dataFromFirestore);
      if(querySnapshot.metadata.fromCache) {
          console.log(`[Firestore Cache] Dados para '${collectionName}' vieram do cache.`);
      } else {
          console.log(`[Firestore Server] Dados para '${collectionName}' vieram do servidor.`);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Erro ao buscar coleção '${collectionName}': `, error);
      setLoading(false);
    });

    return () => {
        console.log(`[Firestore] Desmontando listener para coleção: ${collectionName}`);
        unsubscribe();
    }
  }, [collectionName, initialSort, JSON.stringify(initialFilters)]);

  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
      try {
        const docRef = await addDoc(collection(firestoreDB, collectionName), {
            ...newData,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error) {
        console.error(`Erro ao adicionar documento a '${collectionName}': `, error);
        return null;
      }
  };

  const updateDocument = async (id: string, updatedData: Partial<T>) => {
      try {
          const docRef = doc(firestoreDB, collectionName, id);
          await updateDoc(docRef, updatedData);
      } catch (error) {
          console.error(`Erro ao atualizar documento em '${collectionName}': `, error);
      }
  };

  const deleteDocument = async (id: string) => {
      try {
          const docRef = doc(firestoreDB, collectionName, id);
          await deleteDoc(docRef);
      } catch (error) {
          console.error(`Erro ao deletar documento de '${collectionName}': `, error);
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
