// src/hooks/use-firestore-collection.ts
'use client';
import { useState, useEffect } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { db as dexieDB } from '@/lib/dexie';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, QueryConstraint, WhereFilterOp } from 'firebase/firestore';
import { useLiveQuery } from 'dexie-react-hooks';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string, // Note: sort is not applied to Dexie queries in this simplified hook
  initialFilters: FirestoreQueryFilter[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Read from Dexie (local DB)
  const localData = useLiveQuery(
    async () => {
      const table = (dexieDB as any)[collectionName];
      if (table) {
        // Dexie doesn't support complex queries like Firestore in a simple way.
        // This implementation fetches all data and relies on client-side filtering/sorting
        // for offline display. For more complex offline needs, this would need expansion.
        const allItems = await table.toArray();
        
        let filtered = allItems;

        // Apply filters locally
        if (initialFilters.length > 0) {
            initialFilters.forEach(filter => {
                const [field, op, value] = filter;
                 if (value !== undefined && value !== null && value !== '') {
                    if (op === '==') {
                        filtered = filtered.filter((item: any) => item[field] === value);
                    }
                    // NOTE: Other operators like 'array-contains' are not simply implemented on the client.
                 }
            });
        }
       
        // Apply sorting locally
        if(initialSort && filtered.length > 0 && filtered[0][initialSort]) {
            filtered.sort((a:any, b:any) => {
                if (a[initialSort] < b[initialSort]) return -1;
                if (a[initialSort] > b[initialSort]) return 1;
                return 0;
            });
        }
        
        return filtered as T[];
      }
      return [];
    },
    [collectionName, JSON.stringify(initialFilters), initialSort],
    [] // initial state
  );


  // Effect for reading from Firestore when online
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    
    if (typeof navigator !== 'undefined' && navigator.onLine) {
        setLoading(true);
        let q: any = collection(firestoreDB, collectionName);
        const constraints: QueryConstraint[] = [];
        
        initialFilters.forEach(filter => {
            if (filter[2] !== undefined && filter[2] !== null && filter[2] !== '') {
               constraints.push(where(filter[0], filter[1], filter[2]));
            }
        });
    
        if (constraints.length > 0) {
            q = query(q, ...constraints);
        }

        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const dataFromFirestore = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          } as T));

          setData(dataFromFirestore);
          setLoading(false);
        }, (error) => {
          console.error(`Error fetching collection '${collectionName}' from Firestore: `, error);
          setLoading(false);
          // In case of error, we rely on the local data
          setData(localData || []);
        });
    } else {
        // When offline, immediately use local data
        setData(localData || []);
        setLoading(false);
    }
    
    return () => unsubscribe();
  }, [collectionName, initialSort, JSON.stringify(initialFilters), localData]);
  
  
  // Decide which data to return
  const finalData = (typeof navigator !== 'undefined' && !navigator.onLine) ? localData : data;

  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
    try {
      const cleanedData = Object.fromEntries(
        Object.entries(newData).filter(([_, v]) => v != null && v !== '')
      );
      const docRef = await addDoc(collection(firestoreDB, collectionName), {
        ...cleanedData,
        createdAt: serverTimestamp(),
      });
      // Optionally, you could add the new document to Dexie here as well
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
       // Optionally, you could update the document in Dexie here as well
    } catch (error)      {
      console.error("Error updating document: ", error);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const docRef = doc(firestoreDB, collectionName, id);
      await deleteDoc(docRef);
       // Optionally, you could delete the document in Dexie here as well
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  return { data: finalData || [], loading, addDocument, updateDocument, deleteDocument };
}
