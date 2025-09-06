
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
 * Sincroniza todos os dados do Firestore para o localStorage para uso offline.
 * Limpa as chaves locais e as repopula com os dados mais recentes do servidor.
 */
export async function syncOfflineData() {
  if (typeof window === 'undefined') return;

  try {
    if (navigator.onLine) {
      console.log("[Sync] Buscando todos os dados do Firestore...");
      
      const fetchPromises = COLLECTIONS_TO_SYNC.map(name => 
        fetchAllFromFirestore(name).then(data => ({ name, data }))
      );
      const allCollectionsData = await Promise.all(fetchPromises);

      console.log("[Sync] Limpando localStorage e inserindo novos dados...");
      
      allCollectionsData.forEach(collectionInfo => {
        try {
          localStorage.setItem(collectionInfo.name, JSON.stringify(collectionInfo.data));
          console.log(`[Sync] ${collectionInfo.data.length} documentos sincronizados para a coleção '${collectionInfo.name}'.`);
        } catch (error) {
          console.error(`[Sync] Erro ao salvar a coleção '${collectionInfo.name}' no localStorage.`, error);
          alert(`Não foi possível salvar a coleção '${collectionInfo.name}'. O armazenamento pode estar cheio.`);
        }
      });
      
      console.log("[Sync] Dados sincronizados com sucesso.");

    } else {
      console.log("[Sync] Offline. Usando dados locais do localStorage.");
    }
  } catch (error) {
    console.error("[Sync] Erro durante a sincronização:", error);
    throw error;
  }
}
