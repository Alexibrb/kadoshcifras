
// src/lib/dexie.ts
import Dexie, { type Table } from 'dexie';
import type { Song, Setlist, User, MetadataItem } from '@/types';

interface SyncMetadata {
    id: number;
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
            syncMetadata: 'id'
        });
    }
}

let dbInstance: CifrasDexie | null = null;

if (typeof window !== 'undefined') {
    // Garante uma instância única para evitar problemas com HMR
    if (!(window as any).__CIFRAS_DB__) {
        (window as any).__CIFRAS_DB__ = new CifrasDexie();
    }
    dbInstance = (window as any).__CIFRAS_DB__;
}

export const db = dbInstance as CifrasDexie;

export async function setLastSyncTime(time: Date) {
    if (!db) return;
    try {
        await db.syncMetadata.put({ id: 0, lastSync: time });
    } catch (error) {
        console.error("Falha ao definir o tempo de sincronização:", error);
    }
}

export async function getLastSyncTime(): Promise<Date | null> {
    if (!db) return null;
    try {
        const metadata = await db.syncMetadata.get(0);
        return metadata ? metadata.lastSync : null;
    } catch (error) {
        console.error("Falha ao obter o tempo de sincronização:", error);
        return null;
    }
}
