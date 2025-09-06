import { db as firestoreDB } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

// Lista de todas as coleções que queremos "aquecer" no cache
const COLLECTIONS_TO_SYNC = ['songs', 'setlists', 'artists', 'genres', 'categories', 'users'];

/**
 * Pré-carrega todos os dados do Firestore para o cache offline do Firebase.
 * Isso garante que os dados estejam disponíveis na primeira vez que o usuário ficar offline.
 */
export async function syncOfflineData() {
  if (navigator.onLine) {
      console.log("[Sync] Aquecendo o cache do Firestore...");
      try {
          for (const collectionName of COLLECTIONS_TO_SYNC) {
              // A simples leitura dos dados os adicionará ao cache offline
              await getDocs(collection(firestoreDB, collectionName));
              console.log(`[Sync] Coleção '${collectionName}' carregada para o cache.`);
          }
          console.log("[Sync] Cache do Firestore aquecido com sucesso.");
      } catch (error) {
          console.error("[Sync] Erro ao aquecer o cache do Firestore:", error);
          throw error; // Propaga o erro para ser tratado na UI
      }
  } else {
      console.log("[Sync] Offline. O cache do Firestore será usado automaticamente.");
  }
}