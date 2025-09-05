
// src/services/offline-service.ts
import { collection, getDocs, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const collectionsToCache = ['songs', 'setlists', 'artists', 'genres', 'categories', 'users'];

/**
 * Busca todos os documentos das coleções principais e os armazena
 * no cache de persistência do Firestore para uso offline.
 */
export const cacheAllDataForOffline = async () => {
    console.log("Iniciando o cache de dados para uso offline...");

    const cachePromises = collectionsToCache.map(async (collectionName) => {
        try {
            const q: Query = collection(db, collectionName);
            const querySnapshot = await getDocs(q);
            console.log(`[${collectionName}] ${querySnapshot.docs.length} documentos buscados e colocados em cache.`);
            return { status: 'success', collection: collectionName, count: querySnapshot.docs.length };
        } catch (error) {
            console.error(`Erro ao colocar em cache a coleção '${collectionName}':`, error);
            // Lança o erro para que a Promise.all falhe se uma coleção não puder ser baixada.
            throw new Error(`Falha ao baixar a coleção: ${collectionName}`);
        }
    });

    // Executa todas as promessas de cache em paralelo.
    await Promise.all(cachePromises);

    console.log("Todos os dados foram colocados em cache com sucesso para uso offline.");
};
