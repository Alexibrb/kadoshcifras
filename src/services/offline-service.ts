// src/services/offline-service.ts
import { db as firestoreDB } from '@/lib/firebase';
import { db as dexieDB, setLastSyncTime } from '@/lib/dexie';
import { collection, getDocs, Timestamp } from 'firebase/firestore';

// Função para converter Timestamps aninhados em ISO strings
// Garante que os dados sejam serializáveis para o IndexedDB.
const convertTimestamps = (data: any): any => {
    if (data === null || typeof data !== 'object') {
        return data;
    }

    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }

    if (Array.isArray(data)) {
        return data.map(item => convertTimestamps(item));
    }
    
    const newData: { [key: string]: any } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            newData[key] = convertTimestamps(data[key]);
        }
    }
    return newData;
};


// Lista de coleções que queremos sincronizar
const collectionsToSync = ['songs', 'setlists', 'users', 'artists', 'genres', 'categories'];

export const syncOfflineData = async () => {
    console.log("Iniciando sincronização de dados para uso offline...");

    for (const collectionName of collectionsToSync) {
        try {
            console.log(`Buscando coleção: ${collectionName}`);
            const querySnapshot = await getDocs(collection(firestoreDB, collectionName));
            
            const collectionData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // Converte timestamps antes de salvar
                const convertedData = convertTimestamps(data);
                return { id: doc.id, ...convertedData };
            });
            
            // Determina a tabela Dexie com base no nome da coleção
            const table = (dexieDB as any)[collectionName];

            if (table) {
                await dexieDB.transaction('rw', table, async () => {
                    console.log(`Limpando e salvando dados na tabela Dexie: ${collectionName}`);
                    await table.clear();
                    await table.bulkPut(collectionData);

                    // Debug: Verifica se os dados foram salvos
                    const count = await table.count();
                    console.log(`${count} documentos salvos em '${collectionName}'.`);
                });
            } else {
                console.warn(`Tabela Dexie não encontrada para a coleção: ${collectionName}`);
            }

        } catch (error) {
            console.error(`Erro ao sincronizar a coleção '${collectionName}':`, error);
            // Se uma coleção falhar, continuamos para a próxima.
        }
    }
    
    // Atualiza o timestamp da última sincronização
    await setLastSyncTime(new Date());

    console.log("Sincronização de dados offline concluída.");
};
