
'use client';

// Regex para encontrar todas as notas que podem ser transpostas dentro de uma linha.
// Captura a nota (C, C#, Db, etc.) e o resto do acorde (m7, maj9, /G) separadamente.
const CHORD_REGEX = /([A-G](?:#|b)?)([^A-G\s/]*)/g;

/**
 * Verifica se uma linha de texto consiste principalmente de acordes.
 * A nova abordagem é mais simples e robusta: se não parece ser letra de música,
 * provavelmente é uma linha de cifras.
 *
 * @param line A linha de texto a ser verificada.
 * @returns `true` se for uma linha de cifras, `false` caso contrário.
 */
export const isChordLine = (line: string): boolean => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return false;

    // Se a linha contiver números sozinhos (ex: "1", "2"), é provável que seja um indicador de ordem, não cifra.
    if (/^\d+\s*$/.test(trimmedLine)) {
        return false;
    }
    
    // Remove notações comuns de acordes para não classificar a linha erroneamente como letra.
    const sanitizedLine = trimmedLine
      .replace(/sus|add|aug|dim|maj/gi, '') // Remove palavras-chave de acordes
      .replace(/[0-9]/g, ''); // Remove números (extensões, etc.)

    // Verifica se a linha higienizada contém letras minúsculas (exceto 'm' para menor e 'b' para bemol).
    // A presença de outras letras minúsculas é um forte indicador de que é uma linha de letra.
    const hasLyrics = /[a-ce-ln-z]/.test(sanitizedLine);
    
    return !hasLyrics;
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
    // Prioriza bemóis para certas tonalidades para legibilidade, mas mantém sustenidos como padrão por simplicidade.
    const useFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(SHARP_SCALE[newIndex]);
    return useFlats ? FLAT_SCALE[newIndex] : SHARP_SCALE[newIndex];
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
            // Usa uma regex para encontrar qualquer coisa que pareça um acorde na linha
            // e aplica a transposição a cada correspondência.
            return line.replace(/([A-G](?:#|b)?(?:maj|m|min|dim|aug|sus|M|°|4|6|7|9|11|13)?(?:(?:b|#)\d{1,2})*(?:\/[A-G](?:#|b)?)?)/g, (match) => {
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
