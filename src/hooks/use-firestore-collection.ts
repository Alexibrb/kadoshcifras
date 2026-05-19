'use client';
import { useState, useEffect, useMemo } from 'react';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, onSnapshot, query, where, QueryConstraint, WhereFilterOp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, Query } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export type FirestoreQueryFilter = [string, WhereFilterOp, any];

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialSort?: string,
  initialFilters: FirestoreQueryFilter[] = [],
  enabled: boolean = true
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);

  const filtersJSON = useMemo(() => JSON.stringify(initialFilters), [initialFilters]);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const parsedFilters: FirestoreQueryFilter[] = JSON.parse(filtersJSON);
    
    const areFiltersValid = parsedFilters.every(f => f[2] !== undefined);
    if (!areFiltersValid) {
        setData([]);
        setLoading(false);
        return;
    }
    
    const collectionRef = collection(firestoreDB, collectionName);
    const constraints: QueryConstraint[] = [];

    parsedFilters.forEach(filter => {
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
        return { id: doc.id, ...doc.data() } as T;
      });
      setData(dataFromFirestore);
      setLoading(false);
    }, async (error) => {
      const permissionError = new FirestorePermissionError({
        path: collectionRef.path,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setData([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, initialSort, filtersJSON, enabled]);

  const addDocument = async (newData: Omit<T, 'id' | 'createdAt'>) => {
      const collectionRef = collection(firestoreDB, collectionName);
      try {
        const docRef = await addDoc(collectionRef, {
            ...newData,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error: any) {
        const permissionError = new FirestorePermissionError({
            path: collectionRef.path,
            operation: 'create',
            requestResourceData: newData
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        return null;
      }
  };

  const updateDocument = (id: string, updatedData: Partial<T>) => {
      const docRef = doc(firestoreDB, collectionName, id);
      updateDoc(docRef, updatedData)
        .catch(async (error) => {
             const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: updatedData
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const deleteDocument = (id: string) => {
      const docRef = doc(firestoreDB, collectionName, id);
      deleteDoc(docRef)
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  return {
    data,
    loading,
    addDocument,
    updateDocument,
    deleteDocument
  };
}