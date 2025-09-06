// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, onSnapshot, query, where, QueryConstraint, WhereFilterOp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

function getDataFromLocalStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error(`Error reading ${key} from localStorage`, error);
    return [];
  }
}

function setDataToLocalStorage<T>(key: string, data: T[]) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error writing ${key} to localStorage`, error);
    }
}


export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string, 
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>(() => getDataFromLocalStorage<T>(collectionName));
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
    // If offline, we rely on the data already loaded from localStorage in useState initial value.
    if (!isOnline) {
      setLoading(false);
      return;
    }
    
    // Check if filters are valid before querying
    const areFiltersValid = initialFilters.every(f => f[2] !== undefined && f[2] !== null);
    if (!areFiltersValid) {
        setLoading(false);
        setData([]); // Clear data if filters are not ready
        return; // Don't query firestore
    }

    setLoading(true);

    const collectionRef = collection(firestoreDB, collectionName);
    const constraints: QueryConstraint[] = [];
    
    initialFilters.forEach(filter => {
      // Also check for empty string as it can be an invalid filter value sometimes
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

      // Client-side sort if needed
      if (initialSort) {
          dataFromFirestore = dataFromFirestore.sort((a: any, b: any) => {
              if (a[initialSort] < b[initialSort]) return -1;
              if (a[initialSort] > b[initialSort]) return 1;
              return 0;
          })
      }

      setData(dataFromFirestore);
      setDataToLocalStorage<T>(collectionName, dataFromFirestore);

      setLoading(false);
    }, (error) => {
      console.error(`Error fetching collection '${collectionName}' from Firestore: `, error);
      // On error, fall back to local data
      setData(getDataFromLocalStorage<T>(collectionName));
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
