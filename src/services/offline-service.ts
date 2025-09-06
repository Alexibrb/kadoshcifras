// src/services/offline-service.ts
import { db as dexieDB } from '@/lib/dexie';
import { db as firestoreDB } from '@/lib/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';

const collectionsToSync = ['songs', 'setlists', 'artists', 'genres', 'categories', 'users'];

// Função para converter Timestamps do Firestore para strings ISO 8601
const convertTimestamps = (obj: any): any => {
    if (!obj) return obj;
    if (obj instanceof Timestamp) {
        return obj.toDate().toISOString();
    }
    if (Array.isArray(obj)) {
        return obj.map(convertTimestamps);
    }
    if (typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = convertTimestamps(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
};

export const syncOfflineData = async () => {
    console.log("Iniciando a sincronização de dados para uso offline...");

    try {
        const allData: { [key: string]: any[] } = {};

        // 1. Buscar todos os dados do Firestore diretamente no cliente
        for (const collectionName of collectionsToSync) {
            const querySnapshot = await getDocs(collection(firestoreDB, collectionName));
            const data = querySnapshot.docs.map(doc => {
                const docData = doc.data();
                const convertedData = convertTimestamps(docData);
                return {
                    id: doc.id,
                    ...convertedData
                };
            });
            allData[collectionName] = data;
        }

        // 2. Salvar os dados no IndexedDB (Dexie)
        await dexieDB.transaction('rw', Object.keys(allData), async () => {
            for (const collectionName in allData) {
                // @ts-ignore
                const table = dexieDB[collectionName];
                if (table) {
                    const collectionData = allData[collectionName];

                    const validatedData = collectionData.map((item: any, index: number) => {
                        if (!item.id) {
                            console.warn(`Item na coleção '${collectionName}' sem ID. Gerando UUID:`, item);
                            return { ...item, id: crypto.randomUUID?.() ?? `fallback_${Date.now()}_${index}` };
                        }
                        return item;
                    });

                    await table.clear();
                    console.log(`Tabela local '${collectionName}' limpa.`);

                    await table.bulkPut(validatedData);
                    console.log(`${validatedData.length} registros sincronizados na tabela '${collectionName}'.`);
                }
            }
        });

        console.log("Todos os dados foram sincronizados com sucesso para uso offline.");

    } catch (error: any) {
        console.error("Erro durante a sincronização de dados:", error);
        if (error.code === 'permission-denied') {
             throw new Error("Permissão negada. Verifique suas regras de segurança do Firestore.");
        }
         if (error instanceof Error && error.name === 'ConstraintError') {
            throw new Error("Erro de chave duplicada. Verifique se os registros possuem IDs únicos.");
        }
        throw new Error("Falha ao sincronizar os dados para uso offline.");
    }
};
