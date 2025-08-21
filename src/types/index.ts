export interface Song {
  id: string;
  title: string;
  artist: string;
  content: string; // Lyrics and chords, e.g., "Verse 1:\n[C]Lyrics go [G]here"
  key?: string;
  genre?: string;
}

export interface Setlist {
  id: string;
  name: string;
  songIds: string[];
}
