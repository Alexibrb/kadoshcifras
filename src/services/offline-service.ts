// src/services/offline-service.ts
import { collection, getDocs, getDoc, doc, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/types';

// Coleções que todos os usuários aprovados podem baixar.
const collectionsForList = ['songs', 'setlists', 'artists', 'genres', 'categories'];
const collectionsForDetails = ['songs', 'setlists'];

/**
 * Busca todos os documentos das coleções principais e seus documentos individuais
 * para armazená-los no cache de persistência do Firestore para uso offline.
 * @param appUser - O objeto do usuário do aplicativo para verificar as permissões.
 */
export const cacheAllDataForOffline = async (appUser: User | null) => {
    if (!appUser) {
        throw new Error("Usuário não autenticado ou perfil não carregado.");
    }
    
    console.log("Iniciando o cache de dados para uso offline...");

    const finalCollections = [...collectionsForList];
    
    // Apenas administradores podem baixar a lista de usuários
    if (appUser.role === 'admin') {
        finalCollections.push('users');
    }

    // Primeiro, busca as listas de todas as coleções permitidas
    for (const collectionName of finalCollections) {
        try {
            const q: Query = collection(db, collectionName);
            await getDocs(q);
            console.log(`[${collectionName}] Lista de documentos buscada e cacheada.`);
        } catch (error: any) {
             console.error(`Erro ao colocar em cache a coleção '${collectionName}':`, error.message);
             throw new Error(`Falha ao baixar a lista: ${collectionName}. Verifique as regras de segurança do Firestore.`);
        }
    }
    
    // Em seguida, busca o conteúdo de cada item individualmente para as coleções que precisam de detalhes
    for (const collectionName of collectionsForDetails) {
        try {
            const listSnapshot = await getDocs(collection(db, collectionName));
            const detailPromises = listSnapshot.docs.map(d => getDoc(doc(db, collectionName, d.id)));
            await Promise.all(detailPromises);
            console.log(`[${collectionName}] Conteúdo de ${listSnapshot.docs.length} documentos individuais cacheado.`);
        } catch (error: any) {
            console.error(`Erro ao colocar em cache os detalhes da coleção '${collectionName}':`, error.message);
            throw new Error(`Falha ao baixar os detalhes de: ${collectionName}.`);
        }
    }


    console.log("Todos os dados permitidos foram colocados em cache com sucesso para uso offline.");
};
