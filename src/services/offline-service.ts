
// src/services/offline-service.ts
import { db as firestoreDB } from '@/lib/firebase';
import { db as dexieDB, setLastSyncTime } from '@/lib/dexie';
import { collection, getDocs, Timestamp } from 'firebase/firestore';

// Função para converter Timestamps aninhados em ISO strings de forma segura
const convertTimestamps = (data: any): any => {
    if (data === null || typeof data !== 'object') {
        return data;
    }

    // Verifica se é um Timestamp do Firestore SDK
    if (data instanceof Timestamp) {
        return data.toDate(); // Dexie pode lidar com objetos Date
    }

    // Verifica se é um objeto que se parece com um timestamp serializado
    if (typeof data.seconds === 'number' && typeof data.nanoseconds === 'number') {
        return new Timestamp(data.seconds, data.nanoseconds).toDate();
    }
    
    // Se for um array, processa cada item recursivamente
    if (Array.isArray(data)) {
        return data.map(item => convertTimestamps(item));
    }
    
    // Se for um objeto, processa cada valor recursivamente
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
            console.log(`Buscando coleção: ${collectionName}...`);
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
                    const count = await table.count();
                    console.log(`${count} documentos salvos em '${collectionName}'.`);
                });
            } else {
                console.warn(`Tabela Dexie não encontrada para a coleção: ${collectionName}`);
            }

        } catch (error) {
            console.error(`Erro ao sincronizar a coleção '${collectionName}':`, error);
            // Continua para a próxima coleção mesmo que uma falhe.
        }
    }
    
    // Atualiza o timestamp da última sincronização
    await setLastSyncTime(new Date());

    console.log("Sincronização de dados offline concluída.");
};
