"use client";
import { useState } from "react";
import Dexie from "dexie";

// Inicializa o banco
const db = new Dexie("CifrasDB_Test");
db.version(1).stores({
  songs: "++id,title" // ID automático
});

export default function OfflineTest() {
  const [songs, setSongs] = useState<any[]>([]);

  async function salvarMusicas() {
    try {
      await db.songs.clear();
      await db.songs.bulkAdd([
        { title: "Música A" },
        { title: "Música B" },
        { title: "Música C" }
      ]);
      alert("Músicas salvas no IndexedDB 'CifrasDB_Test'.");
      console.log("Músicas salvas no IndexedDB");
    } catch (e) {
      console.error("Erro ao salvar músicas:", e);
      alert("Erro ao salvar músicas. Verifique o console.");
    }
  }

  async function lerMusicas() {
    try {
      const all = await (db as any).songs.toArray();
      console.log("Músicas lidas do IndexedDB:", all);
      setSongs(all);
      if (all.length === 0) {
        alert("Nenhuma música encontrada no banco de dados de teste.");
      }
    } catch (e) {
      console.error("Erro ao ler músicas:", e);
      alert("Erro ao ler músicas. Verifique o console.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-4 rounded-lg border p-6">
        <h1 className="text-xl font-bold">Teste de Persistência Offline (Dexie)</h1>
        <p className="text-sm text-muted-foreground">
          Use os botões abaixo para testar se o IndexedDB está funcionando corretamente no seu navegador.
        </p>
        <div className="flex gap-4">
          <button
            onClick={salvarMusicas}
            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
          >
            1. Salvar Dados
          </button>
          <button
            onClick={lerMusicas}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            2. Ler Dados
          </button>
        </div>

        <div className="rounded-md border bg-muted/50 p-4">
          <h2 className="font-semibold">Músicas Lidas:</h2>
          {songs.length > 0 ? (
            <ul className="list-inside list-disc pl-2 pt-2">
              {songs.map((s) => (
                <li key={s.id}>{s.title} (ID: {s.id})</li>
              ))}
            </ul>
          ) : (
            <p className="pt-2 text-sm text-muted-foreground">Nenhuma música lida ainda. Clique em "Ler Dados".</p>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          <p><strong>Instruções:</strong></p>
          <ol className="list-inside list-decimal">
            <li>Clique em "Salvar Dados".</li>
            <li>Clique em "Ler Dados" para confirmar que foram salvos.</li>
            <li>Fique offline (no DevTools do navegador).</li>
            <li>Atualize a página.</li>
            <li>Clique em "Ler Dados" novamente. As músicas devem aparecer.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}