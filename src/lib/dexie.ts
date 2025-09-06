
// src/lib/dexie.ts
import Dexie, { type Table } from 'dexie';
import type { Song, Setlist, User, MetadataItem } from '@/types';

export class CifrasDexie extends Dexie {
  songs!: Table<Song>;
  setlists!: Table<Setlist>;
  users!: Table<User>;
  artists!: Table<MetadataItem>;
  genres!: Table<MetadataItem>;
  categories!: Table<MetadataItem>;

  constructor() {
    super('CifrasDB');
    this.version(1).stores({
      // A sintaxe é '++id' para auto-incremento, '&id' para chaves únicas não auto-incrementadas,
      // ou apenas 'id' se o ID é fornecido externamente (nosso caso, vem do Firestore).
      // Em seguida, listamos os campos que queremos indexar para buscas rápidas.
      songs: 'id, title, artist, category, genre',
      setlists: 'id, name, creatorId',
      users: 'id, email, displayName',
      artists: 'id, name',
      genres: 'id, name',
      categories: 'id, name',
    });
  }
}

export const db = new CifrasDexie();
