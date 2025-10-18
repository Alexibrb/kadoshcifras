
import type { Timestamp } from 'firebase/firestore';

// O tipo para o Firestore pode continuar usando Timestamp
export interface FirestoreTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

// O tipo para o app/Dexie usará string ou Date
export type AppTimestamp = string | Date;

export interface Song {
  id: string;
  title: string;
  artist: string;
  content: string;
  key?: string;
  genre?: string;
  category?: string;
  url?: string;
  createdAt?: AppTimestamp;
}

export interface SetlistSong {
  songId: string;
  transpose: number;
}

export interface Setlist {
  id:string;
  name: string;
  songs: SetlistSong[];
  creatorId?: string;
  creatorName?: string;
  isPublic?: boolean;
  isVisible?: boolean;
  createdAt?: AppTimestamp;
}

export interface User {
    id: string;
    displayName: string;
    email: string;
    isApproved: boolean;
    role: 'admin' | 'user';
    createdAt?: AppTimestamp;
}

export interface MetadataItem {
    id: string;
    name: string;
    createdAt?: AppTimestamp;
}

export interface PedalSettings {
    prevPage: string;
    nextPage: string;
    prevSong: string;
    nextSong: string;
}
