
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

    // Se a linha contiver apenas números e pontuação, provavelmente não é cifra.
    if (/^[\d\s.,!?;:"'()-]+$/.test(trimmedLine)) {
        return false;
    }
    
    // Remove tudo que se parece com um acorde para ver o que sobra.
    const nonChordChars = trimmedLine
      .replace(/[A-G](?:#|b)?(?:m|M|maj|min|dim|aug|sus|add|°|\+|-)?(?:\d)?(?:(?:\/[A-G](?:#|b)?))?/g, '')
      .replace(/[()]/g, '') // Remove parênteses
      .trim();

    // Se sobrar muito texto (mais de 4 caracteres), provavelmente é uma linha de letra.
    if (nonChordChars.length > 4) return true;

    // Verifica a presença de letras que são raras em cifras (exceto as que compõem nomes de acordes).
    const hasLyricsChars = /[hij-lknop-rt-vx-z]/i.test(nonChordChars);

    return !hasLyricsChars;
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
    if (!content) return '';

    const lines = content.split('\n');
    
    // Regex melhorada para capturar acordes, incluindo com baixo invertido e notações complexas.
    // Ex: C, Gm, F/A, Gsus4, D(add9)
    const chordRegex = /([A-G](?:#|b)?(?:(?:maj|m|min|dim|aug|sus|add|M|°|\+|-)?(?:\d+)?(?:\([#b]?\d+\))?)*(?:\/[A-G](?:#|b)?)?)/g;

    const transposedLines = lines.map(line => {
        // Verifica se a linha é uma linha de cifra antes de tentar transpor
        if (isChordLine(line)) {
            return line.replace(chordRegex, (match) => {
                // Não transpõe se o "acorde" for apenas uma letra sozinha
                // Isso evita transpor letras em títulos como "Intro (A)"
                if (match.trim().length <= 1 && line.includes('(')) {
                    return match;
                }
                 // Garante que o que foi encontrado é um acorde válido antes de transpor
                if (getNoteIndex(match.charAt(0)) !== -1) {
                    return transposeChord(match, semitones);
                }
                return match;
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
