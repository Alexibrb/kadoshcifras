
import { db } from "@/lib/dexie";
import { api } from "./api-service";

export async function syncOfflineData() {
  if (!db) return;

  try {
    console.log("[Sync] Online?", navigator.onLine);

    if (navigator.onLine) {
      console.log("[Sync] Buscando dados do servidor...");
      const { data } = await api.get("/collections");

      console.log("[Sync] Limpando e inserindo novas coleções...");
      await db.transaction("rw", db.songs, db.artists, db.categories, db.genres, async () => {
        await db.songs.clear();
        await db.artists.clear();
        await db.categories.clear();
        await db.genres.clear();

        await db.songs.bulkPut(data.collections.songs);
        await db.artists.bulkPut(data.collections.artists);
        await db.categories.bulkPut(data.collections.categories);
        await db.genres.bulkPut(data.collections.genres);
      });

      console.log("[Sync] Dados sincronizados com sucesso.");
    } else {
      console.log("[Sync] Offline → usando dados locais.");
      const countSongs = await db.songs.count();
      console.log(`[Sync] Songs já no IndexedDB: ${countSongs}`);
    }
  } catch (error) {
    console.error("[Sync] Erro ao sincronizar:", error);
  }
}
