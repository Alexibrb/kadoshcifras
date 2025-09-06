
import { db as dexieDB, setLastSyncTime } from "@/lib/dexie";
import { db as firestoreDB } from "@/lib/firebase";
import { collection, getDocs, DocumentData } from "firebase/firestore";

// Lista de todas as coleções que queremos sincronizar
const COLLECTIONS_TO_SYNC = ['songs', 'setlists', 'artists', 'genres', 'categories', 'users'];

/**
 * Busca todos os documentos de uma coleção específica no Firestore.
 * @param collectionName O nome da coleção a ser buscada.
 * @returns Uma lista de documentos da coleção.
 */
async function fetchAllFromFirestore(collectionName: string): Promise<DocumentData[]> {
    const querySnapshot = await getDocs(collection(firestoreDB, collectionName));
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));
}


/**
 * Sincroniza todos os dados do Firestore para o Dexie (IndexedDB) para uso offline.
 * Limpa as tabelas locais e as repopula com os dados mais recentes do servidor.
 */
export async function syncOfflineData() {
  if (!dexieDB) return;

  try {
    if (navigator.onLine) {
      console.log("[Sync] Buscando todos os dados do Firestore...");
      
      // Cria um array de promises para buscar todas as coleções em paralelo
      const fetchPromises = COLLECTIONS_TO_SYNC.map(name => fetchAllFromFirestore(name));
      const allCollectionsData = await Promise.all(fetchPromises);

      console.log("[Sync] Limpando tabelas locais e inserindo novos dados...");
      
      // Abre uma transação de escrita para todas as tabelas
      const tables = COLLECTIONS_TO_SYNC.map(name => (dexieDB as any)[name]);
      
      await dexieDB.transaction("rw", tables, async () => {
          for (let i = 0; i < COLLECTIONS_TO_SYNC.length; i++) {
              const collectionName = COLLECTIONS_TO_SYNC[i];
              const table = (dexieDB as any)[collectionName];
              const data = allCollectionsData[i];

              await table.clear();
              if (data.length > 0) {
                await table.bulkPut(data);
              }
              console.log(`[Sync] ${data.length} documentos sincronizados para a coleção '${collectionName}'.`);
          }
      });
      
      await setLastSyncTime(new Date());
      console.log("[Sync] Dados sincronizados com sucesso.");

    } else {
      console.log("[Sync] Offline. Usando dados locais do IndexedDB.");
      const countSongs = await (dexieDB as any).songs.count();
      console.log(`[Sync] Músicas já disponíveis offline: ${countSongs}`);
    }
  } catch (error) {
    console.error("[Sync] Erro durante a sincronização:", error);
    // Lança o erro para que a UI possa notificar o usuário
    throw error;
  }
}
