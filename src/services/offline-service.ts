// src/services/offline-service.ts
import { db as dexieDB } from '@/lib/dexie';

export const syncOfflineData = async () => {
    console.log("Iniciando sincronização de dados...");

    let response;
    try {
        response = await fetch('/api/offline-data');
    } catch (networkError) {
        console.error("Erro de rede:", networkError);
        throw new Error("Falha de conexão. Não foi possível baixar os dados.");
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro da API: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`O servidor retornou um erro: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.collections) {
        throw new Error("Formato de dados inválido. Esperado { collections: {...} }");
    }

    try {
        await dexieDB.transaction('rw', Object.keys(data.collections), async () => {
            for (const collectionName in data.collections) {
                // @ts-ignore
                const table = dexieDB[collectionName];
                if (table) {
                    const collectionData = data.collections[collectionName];

                    // Garante IDs únicos antes de salvar
                    const validatedData = collectionData.map((item: any, index: number) => {
                        if (!item.id) {
                            console.warn(`Item na coleção '${collectionName}' sem ID. Gerando UUID:`, item);
                            return { ...item, id: crypto.randomUUID?.() ?? `fallback_${Date.now()}_${index}` };
                        }
                        return item;
                    });

                    await table.clear();
                    console.log(`Tabela '${collectionName}' limpa.`);

                    // ✅ bulkPut em vez de bulkAdd
                    await table.bulkPut(validatedData);
                    console.log(`${validatedData.length} registros salvos em '${collectionName}'.`);
                }
            }
        });
    } catch (dbError) {
        console.error("Erro Dexie:", dbError);
         if (dbError instanceof Error && dbError.name === 'ConstraintError') {
            throw new Error("Erro de chave duplicada. Verifique se os registros possuem IDs únicos.");
        }
        throw new Error("Falha ao salvar os dados localmente.");
    }

    console.log("Sincronização concluída com sucesso.");
};