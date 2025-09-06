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
        // Incrementamos a versão para aplicar o schema corrigido.
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

export const db = new CifrasDexie();


export async function setLastSyncTime(time: Date) {
    await db.syncMetadata.put({ id: 0, lastSync: time });
}

export async function getLastSyncTime(): Promise<Date | null> {
    const metadata = await db.syncMetadata.get(0);
    return metadata ? metadata.lastSync : null;
}
