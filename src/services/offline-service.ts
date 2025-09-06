
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
      
      // Limpa dados antigos da sincronização anterior
      console.log("[Sync] Limpando localStorage...");
      Object.keys(localStorage).forEach(key => {
        if (key.includes('_doc_') || COLLECTIONS_TO_SYNC.includes(key)) {
            localStorage.removeItem(key);
        }
      });

      console.log("[Sync] Inserindo novos dados...");
      // Processa cada coleção sequencialmente para melhor controle de erro
      for (const collectionName of COLLECTIONS_TO_SYNC) {
          try {
              const data = await fetchAllFromFirestore(collectionName);
              
              // Salva cada documento da coleção individualmente
              for (const doc of data) {
                  const docKey = `${collectionName}_doc_${doc.id}`;
                  try {
                      localStorage.setItem(docKey, JSON.stringify(doc));
                  } catch (error: any) {
                      // Se o erro for de quota excedida, paramos a sincronização aqui
                      if (error.name === 'QuotaExceededError') {
                          console.error(`[Sync] Quota do localStorage excedida ao tentar salvar ${docKey}. Parando a sincronização.`);
                          alert("Armazenamento cheio. Nem todos os dados puderam ser sincronizados. O que foi salvo até agora está disponível offline.");
                          // Retorna para interromper a função completamente
                          return; 
                      }
                      // Lança outros erros
                      throw error;
                  }
              }

              // Salva a lista de IDs da coleção para referência
               const collectionIds = data.map(doc => doc.id);
               localStorage.setItem(collectionName, JSON.stringify(collectionIds));
              
              console.log(`[Sync] ${data.length} documentos sincronizados para a coleção '${collectionName}'.`);
          } catch (fetchError) {
             console.error(`[Sync] Erro ao buscar ou salvar a coleção '${collectionName}'.`, fetchError);
             alert(`Não foi possível sincronizar a coleção '${collectionName}'.`);
          }
      }
      
      console.log("[Sync] Dados sincronizados com sucesso.");

    } else {
      console.log("[Sync] Offline. Usando dados locais do localStorage.");
    }
  } catch (error) {
    console.error("[Sync] Erro durante a sincronização:", error);
    throw error;
  }
}
