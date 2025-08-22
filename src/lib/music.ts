'use client';

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Regex aprimorada para capturar acordes complexos e notas de baixo.
// Grupo 1: Nota fundamental do acorde (ex: C, F#, Gb)
// Grupo 2: Qualidade do acorde (ex: m7, maj7, dim, /G#, etc.)
const CHORD_REGEX = /([A-G](?:#|b)?)([^A-G\s/]*)/g;
const BASS_NOTE_REGEX = /\/([A-G](?:#|b)?)/;

const getNoteIndex = (note: string): number => {
  // Garante que a nota seja capitalizada para corresponder às escalas.
  const capitalizedNote = note.charAt(0).toUpperCase() + note.slice(1);
  let sharpIndex = SHARP_SCALE.indexOf(capitalizedNote);
  if (sharpIndex !== -1) {
    return sharpIndex;
  }
  let flatIndex = FLAT_SCALE.indexOf(capitalizedNote);
  if (flatIndex !== -1) {
    return flatIndex;
  }
  return -1;
};

const transposeNote = (note: string, semitones: number): string => {
    const noteIndex = getNoteIndex(note);
    if (noteIndex === -1) {
        return note;
    }
    const newIndex = (noteIndex + semitones + 12) % 12;
    // Por padrão, retorna sustenidos para consistência.
    return SHARP_SCALE[newIndex];
}

export const transposeChord = (chord: string, semitones: number): string => {
  if (semitones === 0) return chord;
  
  // 1. Tenta extrair a nota do baixo primeiro.
  const bassMatch = chord.match(BASS_NOTE_REGEX);
  let mainChordPart = chord;
  let bassPart = '';

  if (bassMatch) {
    mainChordPart = chord.split('/')[0];
    const bassNote = bassMatch[1];
    const transposedBass = transposeNote(bassNote, semitones);
    bassPart = '/' + transposedBass;
  }

  // 2. Transpõe a parte principal do acorde.
  const rootMatch = mainChordPart.match(/^([A-G](?:#|b)?)/);
  if (!rootMatch) {
    return chord; // Retorna o acorde original se nenhuma nota fundamental for encontrada.
  }
  
  const rootNote = rootMatch[1];
  const quality = mainChordPart.substring(rootNote.length);
  const transposedRoot = transposeNote(rootNote, semitones);

  return `${transposedRoot}${quality}${bassPart}`;
};


export const transposeContent = (content: string, semitones: number): string => {
    if (semitones === 0) return content;
  
    // Regex para encontrar todos os acordes em uma linha, lidando com espaços.
    const CHORDS_IN_LINE_REGEX = /([A-G](?:#|b)?(?:[^A-G\s/]*)(?:\/[A-G](?:#|b)?)?)/g;
  
    return content.replace(CHORDS_IN_LINE_REGEX, (match) => {
        // Evita a transposição de texto que se parece com notas dentro de palavras.
        if (match.startsWith('/') || match.startsWith('(')) return match;
        return transposeChord(match, semitones);
    });
};


export const parseChordsFromContent = (content: string): string[] => {
  const chords = new Set<string>();
  const matches = content.matchAll(CHORD_REGEX);
  for (const match of matches) {
    chords.add(match[0]);
  }
  return Array.from(chords);
}
