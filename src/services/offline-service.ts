import { db as firestoreDB } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

// Helper para salvar dados no localStorage
const setDataToLocalStorage = (key: string, data: any) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Falha ao salvar a coleção '${key}' no localStorage. O armazenamento pode estar cheio.`, e);
        // Lança o erro para ser pego pelo chamador
        throw e;
    }
};

const COLLECTIONS_TO_SYNC = ['songs', 'setlists', 'artists', 'genres', 'categories', 'users'];

/**
 * Pré-carrega todos os dados do Firestore para o localStorage para uso offline.
 */
export async function syncOfflineData() {
  if (navigator.onLine) {
      console.log("[Sync] Iniciando sincronização para localStorage...");
      try {
          for (const collectionName of COLLECTIONS_TO_SYNC) {
              console.log(`[Sync] Buscando coleção '${collectionName}'...`);
              const querySnapshot = await getDocs(collection(firestoreDB, collectionName));
              const dataFromFirestore = querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
              }));
              
              // Salva a coleção inteira em uma única chave.
              setDataToLocalStorage(`collection_${collectionName}`, dataFromFirestore);

              console.log(`[Sync] Coleção '${collectionName}' salva no localStorage.`);
          }
          console.log("[Sync] Sincronização com localStorage concluída com sucesso.");
      } catch (error) {
          console.error("[Sync] Erro durante a sincronização com localStorage:", error);
          // Propaga o erro para ser tratado na UI (por exemplo, exibir um toast de erro)
          throw error;
      }
  } else {
      console.log("[Sync] Offline. Não é possível iniciar a sincronização.");
      throw new Error("Você precisa estar online para sincronizar os dados.");
  }
}
