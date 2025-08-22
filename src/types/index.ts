import type { Timestamp } from 'firebase/firestore';

export interface Song {
  id: string;
  title: string;
  artist: string;
  content: string; // Letras e cifras, ex: "Verso 1:\n[C]Letra vai [G]aqui"
  key?: string;
  genre?: string;
  category?: string;
  createdAt?: Timestamp;
}

export interface Setlist {
  id: string;
  name: string;
  songIds: string[];
}

export interface User {
    id: string;
    displayName: string;
    email: string;
    isApproved: boolean;
    role: 'admin' | 'user';
    createdAt: Timestamp;
}
