
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
                    const collectionData = data.collections[collectionName];
                    
                    // Validação e mapeamento para garantir que cada item tem um 'id'
                    const validatedData = collectionData.map((item: any, index: number) => {
                        if (!item.id) {
                            console.warn(`Item na coleção '${collectionName}' sem ID, usando índice como fallback:`, item);
                            // Cria um ID de fallback, embora o ideal é que sempre venha da API
                            return { ...item, id: `fallback_${Date.now()}_${index}` };
                        }
                        return item;
                    });
                    
                    // Limpa a tabela antes de adicionar novos dados
                    await table.clear();
                    console.log(`Tabela local '${collectionName}' limpa.`);

                    // Adiciona os dados validados em massa
                    await table.bulkAdd(validatedData);
                    console.log(`${validatedData.length} registros adicionados à tabela '${collectionName}'.`);
                }
            }
        });
    } catch (dbError) {
        console.error("Erro ao salvar dados no IndexedDB:", dbError);
        // Dexie fornece erros detalhados. Se for um 'ConstraintError', é provável que seja uma chave duplicada.
        if (dbError instanceof Error && dbError.name === 'ConstraintError') {
             throw new Error("Erro de dados duplicados. Não foi possível salvar os dados no dispositivo.");
        }
        throw new Error("Não foi possível salvar os dados no dispositivo.");
    }

    console.log("Todos os dados foram sincronizados com sucesso para uso offline.");
};
