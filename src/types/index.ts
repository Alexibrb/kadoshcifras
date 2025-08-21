export interface Song {
  id: string;
  title: string;
  artist: string;
  content: string; // Letras e cifras, ex: "Verso 1:\n[C]Letra vai [G]aqui"
  key?: string;
  genre?: string;
}

export interface Setlist {
  id: string;
  name: string;
  songIds: string[];
}
