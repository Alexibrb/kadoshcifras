
'use client';

// Regex para identificar a nota base (C, C#, Db) e o resto do acorde (m7, maj9, /G, etc.)
const CHORD_REGEX = /([A-G](?:#|b)?)([^A-G\s/]*)/g;

// Regex mais estrita para validar se uma string é um acorde provável.
// Reconhece a nota base, qualidades (m, maj, dim, aug, sus), extensões (7, 9, 11, 13),
// alterações (b5, #9) e inversões de baixo (/G, /F#).
const STRICT_CHORD_REGEX = /^[A-G](b|#)?(maj|m|min|dim|aug|sus|M)?(2|4|5|6|7|9|11|13)?(b5|#5|b9|#9|#11|b11|b13|#13)?(°)?(\/[A-G](b|#)?)?$/;

/**
 * Verifica se uma linha de texto consiste principalmente de acordes.
 * @param line A linha de texto a ser verificada.
 * @returns true se for uma linha de cifras, false caso contrário.
 */
export const isChordLine = (line: string): boolean => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return false;

    // Se a linha contiver letras minúsculas (exceto 'b' para bemóis em inversões),
    // é provável que seja letra de música.
    const hasLyrics = /[a-ce-z]/.test(trimmedLine.replace(/\s+/g, ''));
     if (hasLyrics) {
        return false;
    }


    const parts = trimmedLine.split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 0) return false;

    // Conta quantas partes parecem ser acordes.
    const chordCount = parts.filter(part => STRICT_CHORD_REGEX.test(part)).length;

    // Considera uma linha de cifras se a maioria das partes (ex: 75%) forem acordes.
    // Isso adiciona flexibilidade para anotações como "2x" ou "Riff".
    const percentage = chordCount / parts.length;
    return percentage >= 0.75;
};


const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];


const getNoteIndex = (note: string): number => {
  const capitalizedNote = note.charAt(0).toUpperCase() + note.slice(1);
  let sharpIndex = SHARP_SCALE.indexOf(capitalizedNote);
  if (sharpIndex !== -1) return sharpIndex;
  let flatIndex = FLAT_SCALE.indexOf(capitalizedNote);
  return flatIndex;
};

const transposeNote = (note: string, semitones: number): string => {
    const noteIndex = getNoteIndex(note);
    if (noteIndex === -1) return note;
    const newIndex = (noteIndex + semitones + 12) % 12;
    return SHARP_SCALE[newIndex];
}

export const transposeChord = (chord: string, semitones: number): string => {
  if (semitones === 0) return chord;
  
  const bassMatch = chord.match(/\/([A-G](?:#|b)?)/);
  let mainChordPart = chord;
  let bassPart = '';

  if (bassMatch) {
    mainChordPart = chord.split('/')[0];
    const bassNote = bassMatch[1];
    const transposedBass = transposeNote(bassNote, semitones);
    bassPart = '/' + transposedBass;
  }

  const rootMatch = mainChordPart.match(/^[A-G](?:#|b)?/);
  if (!rootMatch) return chord;
  
  const rootNote = rootMatch[0];
  const quality = mainChordPart.substring(rootNote.length);
  const transposedRoot = transposeNote(rootNote, semitones);

  return `${transposedRoot}${quality}${bassPart}`;
};


export const transposeContent = (content: string, semitones: number): string => {
    if (semitones === 0) return content;

    const lines = content.split('\n');
    const transposedLines = lines.map(line => {
        if (isChordLine(line)) {
            // Usa regex para encontrar todos os acordes na linha.
            return line.replace(/([A-G](?:#|b)?(?:maj|m|min|dim|aug|sus|M)?(?:2|4|5|6|7|9|11|13)?(?:b5|#5|b9|#9|#11|b11|b13|#13)?(?:°)?(?:\/[A-G](?:#|b)?)?)/g, (match) => {
                return transposeChord(match, semitones);
            });
        }
        return line;
    });

    return transposedLines.join('\n');
};


export const parseChordsFromContent = (content: string): string[] => {
  const chords = new Set<string>();
  const matches = content.matchAll(CHORD_REGEX);
  for (const match of matches) {
    chords.add(match[0]);
  }
  return Array.from(chords);
}

