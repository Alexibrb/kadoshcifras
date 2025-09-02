
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

  // 1. Remove potenciais acordes e vê o que sobra.
  // Regex aprimorada para capturar acordes complexos, incluindo baixo invertido.
  const withoutChords = trimmedLine.replace(/([A-G](?:#|b)?(?:m|M|maj|min|dim|aug|sus|add|°|\+|-)?(?:\d)?(?:(?:\/[A-G](?:#|b)?))?)/g, '');

  // 2. Remove caracteres que podem aparecer em linhas de cifra (parênteses, barras, etc).
  const cleanLine = withoutChords.replace(/[\s()|]/g, '');

  // 3. Se não sobrar nada, é definitivamente uma linha de cifra.
  if (cleanLine.length === 0) return true;

  // 4. Verifica se os caracteres restantes são incomuns em letras.
  // Linhas de letra raramente contêm apenas caracteres como 'm', 'j', 'd', 's', etc.
  const lyricCharsRegex = /[hijklnopqrstuvwxyzHIJKLNPQRSTUVWXYZ]/;
  if (lyricCharsRegex.test(cleanLine)) {
    return false;
  }
  
  // 5. Conta as "palavras" vs. o total de caracteres. Linhas de cifra têm baixa densidade de caracteres.
  const words = trimmedLine.split(/\s+/).filter(Boolean);
  const totalChars = trimmedLine.replace(/\s+/g, '').length;
  if (words.length > 0 && totalChars / words.length < 3) {
     // Palavras curtas (como C, G, Am) são típicas de cifras.
     return true;
  }
  
  // 6. Se sobrou algo mas as outras regras não se aplicaram, assume que não é uma linha de cifra.
  // Esta é uma salvaguarda contra falsos positivos.
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
