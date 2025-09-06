import { db as firestoreDB } from "@/lib/firebase";
import { collection, getDocs, writeBatch } from "firebase/firestore";

const COLLECTIONS_TO_SYNC = ['songs', 'setlists', 'artists', 'genres', 'categories', 'users'];

/**
 * Pré-carrega ("aquece") o cache do Firestore para disponibilizar os dados offline.
 * Ele faz isso simplesmente lendo todos os documentos das coleções especificadas.
 * O próprio SDK do Firestore cuida do armazenamento em cache.
 */
export async function syncOfflineData() {
  if (navigator.onLine) {
    console.log("[Sync] Iniciando aquecimento do cache do Firestore...");
    try {
      for (const collectionName of COLLECTIONS_TO_SYNC) {
        console.log(`[Sync] Lendo coleção '${collectionName}' para o cache...`);
        // Simplesmente ler os documentos é suficiente para o SDK armazená-los em cache
        // se a persistência estiver habilitada.
        await getDocs(collection(firestoreDB, collectionName));
        console.log(`[Sync] Coleção '${collectionName}' carregada no cache.`);
      }
      console.log("[Sync] Aquecimento do cache do Firestore concluído com sucesso.");
    } catch (error) {
      console.error("[Sync] Erro durante o aquecimento do cache:", error);
      // Propaga o erro para ser tratado na UI
      throw error;
    }
  } else {
    console.log("[Sync] Offline. Não é possível iniciar a sincronização.");
    throw new Error("Você precisa estar online para sincronizar os dados.");
  }
}
