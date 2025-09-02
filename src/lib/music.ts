

'use client';

/**
 * Verifica se uma linha de texto consiste principalmente de acordes.
 * Esta função é crucial para evitar a transposição de texto de letra normal.
 *
 * @param line A linha de texto a ser verificada.
 * @returns `true` se for uma linha de cifras, `false` caso contrário.
 */
export const isChordLine = (line: string): boolean => {
  const trimmedLine = line.trim();
  if (!trimmedLine) return false;

  // 1. Remove common non-chord annotations like [Intro], (x2), etc.
  const lineWithoutAnnotations = trimmedLine.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
  if (!lineWithoutAnnotations) return true; // Line only contained annotations

  // 2. Remove potential chords and see what's left.
  const withoutChords = lineWithoutAnnotations.replace(/([A-G](?:#|b)?(?:m|M|maj|min|dim|aug|sus|add|°|\+|-)?(?:\d)?(?:(?:\/[A-G](?:#|b)?))?)/g, '');

  // 3. Remove characters that are common in chord lines (spaces, slashes, numbers, 'x' for repetition, etc.)
  const cleanLine = withoutChords.replace(/[\s/|\d.x]/gi, '');

  // 4. If almost nothing is left, it's very likely a chord line.
  // We allow a small number of remaining characters to account for typos or odd symbols.
  if (cleanLine.length <= 2) return true;
  
  // 5. If there's still significant text left, it's likely a lyrics line.
  return false;
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
    
    const chordRegex = /([A-G](?:#|b)?(?:(?:maj|m|min|dim|aug|sus|add|M|°|\+|-)?(?:\d+)?(?:\([#b]?\d+\))?)*(?:\/[A-G](?:#|b)?)?)/g;

    const transposedLines = lines.map(line => {
        if (isChordLine(line)) {
            return line.replace(chordRegex, (match) => {
                if (!match.trim()) return match; // Ignora espaços em branco
                // Adiciona uma verificação para não transpor coisas dentro de parênteses que não são acordes.
                if (line.includes('(') && !/^[A-G]/.test(match)) {
                  return match;
                }
                return transposeChord(match, semitones);
            });
        }
        return line;
    });

    return transposedLines.join('\n');
};

const CHORD_REGEX = /([A-G](?:#|b)?)([^A-G\s/]*)/g;

export const parseChordsFromContent = (content: string): string[] => {
  const chords = new Set<string>();
  const lines = content.split('\n');
  lines.forEach(line => {
    if (isChordLine(line)) {
        const matches = line.match(/([A-G](?:#|b)?(?:(?:maj|m|min|dim|aug|sus|add|M|°|\+|-)?(?:\d+)?(?:\([#b]?\d+\))?)*(?:\/[A-G](?:#|b)?)?)/g);
        if (matches) {
            matches.forEach(chord => chords.add(chord));
        }
    }
  });

  return Array.from(chords);
}
