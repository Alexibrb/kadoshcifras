'use client';

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Regex expandido para detectar uma gama maior de acordes
const CHORD_REGEX = /\b([A-G](b|#)?(m|maj|dim|aug|sus|add)?(2|4|5|6|7|9|11|13)?(b5|#5|b9|#9|b11|#11|b13|#13)?(maj7|M7)?(m7)?(sus4)?(sus2)?(add9)?(add11)?(add13)?(\/([A-G](b|#)?))?((°))?)\b/g;


const normalizeChord = (chord: string): { root: string, quality: string, bass?: string } => {
  const parts = chord.split('/');
  const mainChord = parts[0];
  const bass = parts[1];

  let root = mainChord.charAt(0);
  let quality = '';

  if (mainChord.length > 1 && (mainChord.charAt(1) === '#' || mainChord.charAt(1) === 'b')) {
    root += mainChord.charAt(1);
    quality = mainChord.substring(2);
  } else {
    quality = mainChord.substring(1);
  }
  return { root, quality, bass };
};

const getNoteIndex = (note: string): number => {
  const sharpIndex = SHARP_SCALE.indexOf(note);
  if (sharpIndex !== -1) return sharpIndex;
  
  const flatIndex = FLAT_SCALE.indexOf(note);
  if (flatIndex !== -1) return flatIndex;

  return -1;
};

export const transposeChord = (chord: string, semitones: number): string => {
  if (semitones === 0) return chord;
  
  const { root, quality, bass } = normalizeChord(chord);
  const noteIndex = getNoteIndex(root);
  
  if (noteIndex === -1) return chord;
  
  const newIndex = (noteIndex + semitones + 12) % 12;
  const newRoot = SHARP_SCALE[newIndex];
  
  let newBass = '';
  if (bass) {
    const bassNoteIndex = getNoteIndex(bass);
    if (bassNoteIndex !== -1) {
      const newBassIndex = (bassNoteIndex + semitones + 12) % 12;
      newBass = `/${SHARP_SCALE[newBassIndex]}`;
    } else {
       newBass = `/${bass}`;
    }
  }

  return `${newRoot}${quality}${newBass}`;
};

export const transposeContent = (content: string, semitones: number): string => {
  if (semitones === 0) return content;
  return content.replace(CHORD_REGEX, (match) => {
    // Evita transpor palavras que podem ser confundidas com acordes (ex: "Am" em "I Am")
    // Verificando o contexto da linha. Se a linha contiver letras além das de acordes, não transpõe.
    // Esta é uma heurística imperfeita, a lógica de detecção de linha de cifra está no SongDisplay.
    const parts = match.split(/\s+/);
    if(parts.some(part => /[a-z]/.test(part) && part.length > 2)) return match;
    
    return transposeChord(match, semitones);
  });
};

export const parseChordsFromContent = (content: string): string[] => {
  const chords = new Set<string>();
  const matches = content.matchAll(CHORD_REGEX);
  for (const match of matches) {
    chords.add(match[1]);
  }
  return Array.from(chords);
}
