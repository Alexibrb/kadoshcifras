// src/lib/dexie.ts
import Dexie, { type Table } from 'dexie';
import type { Song, Setlist, User, MetadataItem } from '@/types';

// O tipo para o nosso metadata, que pode ser usado por mais de uma tabela.
interface SyncMetadata {
    id: number; // Apenas 1 registro com id=0
    lastSync: Date;
}

export class CifrasDexie extends Dexie {
    songs!: Table<Song>;
    setlists!: Table<Setlist>;
    users!: Table<User>;
    artists!: Table<MetadataItem>;
    genres!: Table<MetadataItem>;
    categories!: Table<MetadataItem>;
    syncMetadata!: Table<SyncMetadata>;

    constructor() {
        super('CifrasDB');
        this.version(2).stores({
            songs: 'id, title, artist, category, genre',
            setlists: 'id, name, creatorId, isPublic, isVisible',
            users: 'id, email',
            artists: 'id, name',
            genres: 'id, name',
            categories: 'id, name',
            syncMetadata: 'id' // Tabela simples para armazenar o timestamp
        });
    }
}

// Guarda para garantir que o Dexie só seja instanciado no cliente
// e que seja uma instância única (singleton)
let dbInstance: CifrasDexie | null = null;

if (typeof window !== 'undefined') {
    if (!(window as any).__CIFRAS_DB__) {
        (window as any).__CIFRAS_DB__ = new CifrasDexie();
    }
    dbInstance = (window as any).__CIFRAS_DB__;
}


export const db = dbInstance as CifrasDexie;


export async function setLastSyncTime(time: Date) {
    if (!db) return;
    await db.syncMetadata.put({ id: 0, lastSync: time });
}

export async function getLastSyncTime(): Promise<Date | null> {
    if (!db) return null;
    const metadata = await db.syncMetadata.get(0);
    return metadata ? metadata.lastSync : null;
}
