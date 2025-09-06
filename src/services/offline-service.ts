
// src/services/offline-service.ts
import { collection, getDocs, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/types';

// Coleções que todos os usuários aprovados podem baixar.
const baseCollectionsToCache = ['songs', 'setlists', 'artists', 'genres', 'categories'];

/**
 * Busca todos os documentos das coleções principais e os armazena
 * no cache de persistência do Firestore para uso offline.
 * @param appUser - O objeto do usuário do aplicativo para verificar as permissões.
 */
export const cacheAllDataForOffline = async (appUser: User | null) => {
    // A verificação do appUser aqui é um gate de segurança para garantir que apenas usuários logados
    // e com perfil carregado possam iniciar o download.
    if (!appUser) {
        throw new Error("Usuário não autenticado ou perfil não carregado.");
    }
    
    console.log("Iniciando o cache de dados para uso offline...");

    const collectionsToCache = [...baseCollectionsToCache];
    
    // Adiciona a coleção 'users' ao download SOMENTE se o usuário for um administrador.
    // As regras de segurança do Firestore devem espelhar essa lógica para que a leitura seja permitida.
    if (appUser.role === 'admin') {
        collectionsToCache.push('users');
    }

    const cachePromises = collectionsToCache.map(async (collectionName) => {
        try {
            // Esta operação ocorre no lado do cliente.
            // O getDocs irá primeiro tentar buscar os dados mais recentes da rede.
            // O SDK do Firestore irá então automaticamente armazenar esses documentos no cache offline (IndexedDB).
            const q: Query = collection(db, collectionName);
            const querySnapshot = await getDocs(q);
            console.log(`[${collectionName}] ${querySnapshot.docs.length} documentos buscados e colocados em cache.`);
            return { status: 'success', collection: collectionName, count: querySnapshot.docs.length };
        } catch (error: any) {
             // Se ocorrer um erro de permissão do Firestore, ele será capturado aqui.
            console.error(`Erro ao colocar em cache a coleção '${collectionName}':`, error.message);
            throw new Error(`Falha ao baixar a coleção: ${collectionName}. Verifique as regras de segurança do Firestore.`);
        }
    });

    await Promise.all(cachePromises);

    console.log("Todos os dados permitidos foram colocados em cache com sucesso para uso offline.");
};
