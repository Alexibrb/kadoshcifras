// src/services/offline-service.ts
import { collection, getDocs, getDoc, doc, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/types';

// Coleções que todos os usuários aprovados podem baixar.
const collectionsToCache = ['songs', 'setlists', 'artists', 'genres', 'categories'];

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

    const finalCollections = [...collectionsToCache];
    
    if (appUser.role === 'admin') {
        finalCollections.push('users');
    }

    const cachePromises = finalCollections.map(async (collectionName) => {
        try {
            const q: Query = collection(db, collectionName);
            const querySnapshot = await getDocs(q);
            const docs = querySnapshot.docs;
            console.log(`[${collectionName}] ${docs.length} documentos da lista buscados.`);

            // Agora, busca cada documento individualmente para garantir que seu conteúdo seja cacheado.
            // Isso é crucial para a página de detalhes do item funcionar offline.
            const individualDocPromises = docs.map(d => getDoc(doc(db, collectionName, d.id)));
            await Promise.all(individualDocPromises);
            
            console.log(`[${collectionName}] Conteúdo de ${docs.length} documentos individuais colocado em cache.`);

            return { status: 'success', collection: collectionName, count: docs.length };
        } catch (error: any) {
            console.error(`Erro ao colocar em cache a coleção '${collectionName}':`, error.message);
            throw new Error(`Falha ao baixar a coleção: ${collectionName}. Verifique as regras de segurança do Firestore.`);
        }
    });

    await Promise.all(cachePromises);

    console.log("Todos os dados permitidos foram colocados em cache com sucesso para uso offline.");
};
