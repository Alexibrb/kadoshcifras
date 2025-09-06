// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, onSnapshot, query, where, QueryConstraint, WhereFilterOp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

// Função para ler documentos individuais do localStorage com base em uma lista de IDs
function getDocsFromLocalStorage<T>(collectionName: string): T[] {
  if (typeof window === 'undefined') return [];
  const items: T[] = [];
  try {
    // A chave principal da coleção agora guarda os IDs dos documentos
    const idListString = window.localStorage.getItem(collectionName);
    const ids = idListString ? JSON.parse(idListString) : [];
    
    for (const id of ids) {
        const itemString = window.localStorage.getItem(`${collectionName}_doc_${id}`);
        if (itemString) {
            items.push(JSON.parse(itemString));
        }
    }
  } catch (error) {
    console.error(`Error reading collection ${collectionName} from localStorage`, error);
  }
  return items;
}

// Função para salvar uma coleção inteira, dividindo em documentos individuais
function setCollectionToLocalStorage<T extends { id: string }>(collectionName: string, data: T[]) {
    if (typeof window === 'undefined') return;
    try {
        const ids = data.map(item => item.id);
        // Salva a lista de IDs na chave principal
        window.localStorage.setItem(collectionName, JSON.stringify(ids));
        
        // Salva cada documento individualmente
        for (const item of data) {
            window.localStorage.setItem(`${collectionName}_doc_${item.id}`, JSON.stringify(item));
        }
    } catch (error) {
        console.error(`Error writing collection ${collectionName} to localStorage. It may be full.`, error);
        // Não lançamos o erro para não quebrar a aplicação, apenas logamos.
    }
}


export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string, 
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>(() => getDocsFromLocalStorage<T>(collectionName));
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

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
    // Se estiver offline, confiamos nos dados já carregados do localStorage.
    if (!isOnline) {
      setData(getDocsFromLocalStorage<T>(collectionName));
      setLoading(false);
      return;
    }
    
    // Verifica se os filtros são válidos antes de consultar o Firestore
    const areFiltersValid = initialFilters.every(f => f[2] !== undefined && f[2] !== null);
    if (!areFiltersValid) {
        setLoading(false);
        setData([]); // Limpa os dados se os filtros não estiverem prontos
        return; // Não consulta o Firestore
    }

    setLoading(true);

    const collectionRef = collection(firestoreDB, collectionName);
    const constraints: QueryConstraint[] = [];
    
    initialFilters.forEach(filter => {
      if (filter[2] !== undefined && filter[2] !== null && filter[2] !== '') {
        constraints.push(where(filter[0], filter[1], filter[2]));
      }
    });

    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let dataFromFirestore = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));

      // Ordenação no lado do cliente, se necessário
      if (initialSort) {
          dataFromFirestore = dataFromFirestore.sort((a: any, b: any) => {
              if (a[initialSort] < b[initialSort]) return -1;
              if (a[initialSort] > b[initialSort]) return 1;
              return 0;
          })
      }

      setData(dataFromFirestore);
      // Salva a coleção inteira no localStorage de forma otimizada
      setCollectionToLocalStorage<T>(collectionName, dataFromFirestore);

      setLoading(false);
    }, (error) => {
      console.error(`Error fetching collection '${collectionName}' from Firestore: `, error);
      // Em caso de erro, recorre aos dados locais
      setData(getDocsFromLocalStorage<T>(collectionName));
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