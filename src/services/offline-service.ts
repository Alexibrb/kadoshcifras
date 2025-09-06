
// src/services/offline-service.ts
import { db as dexieDB } from '@/lib/dexie';

/**
 * Fetches all necessary data from the server via a dedicated API endpoint
 * and stores it in the local IndexedDB database using Dexie.
 */
export const syncOfflineData = async () => {
    console.log("Iniciando a sincronização de dados para uso offline...");

    let response;
    try {
        // A URL da API pode ser absoluta se o frontend e o backend estiverem em domínios diferentes
        response = await fetch('/api/offline-data');
    } catch (networkError) {
        console.error("Erro de rede ao buscar dados offline:", networkError);
        throw new Error("Falha de conexão. Não foi possível baixar os dados.");
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro da API ao buscar dados offline: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`O servidor retornou um erro: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.collections) {
        throw new Error("Formato de dados da API inválido.");
    }

    try {
        await dexieDB.transaction('rw', Object.keys(data.collections), async () => {
            for (const collectionName in data.collections) {
                // @ts-ignore
                const table = dexieDB[collectionName];
                if (table) {
                    await table.clear();
                    console.log(`Tabela local '${collectionName}' limpa.`);
                    await table.bulkAdd(data.collections[collectionName]);
                    console.log(`${data.collections[collectionName].length} registros adicionados à tabela '${collectionName}'.`);
                }
            }
        });
    } catch (dbError) {
        console.error("Erro ao salvar dados no IndexedDB:", dbError);
        throw new Error("Não foi possível salvar os dados no dispositivo.");
    }

    console.log("Todos os dados foram sincronizados com sucesso para uso offline.");
};
