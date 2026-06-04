'use client';

/**
 * Verifica se uma linha de texto consiste principalmente de acordes.
 */
export const isChordLine = (line: string): boolean => {
  const trimmedLine = line.trim();
  if (!trimmedLine) return false;

  // 1. Remove common non-chord annotations
  const lineWithoutAnnotations = trimmedLine.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
  if (!lineWithoutAnnotations) return true;

  // 2. Remove potential chords and see what's left.
  const withoutChords = lineWithoutAnnotations.replace(/([A-G](?:#|b)?(?:m|M|maj|min|dim|aug|sus|add|°|\+|-)?(?:\d)?(?:(?:\/[A-G](?:#|b)?))?)/g, '');

  // 3. Clean common characters
  const cleanLine = withoutChords.replace(/[\s/|\d.x]/gi, '');

  // 4. If almost nothing left, it's chords
  return cleanLine.length <= 2;
};

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const getNoteIndex = (note: string): number => {
  const capitalizedNote = note.charAt(0).toUpperCase() + note.slice(1);
  let sharpIndex = SHARP_SCALE.indexOf(capitalizedNote);
  if (sharpIndex !== -1) return sharpIndex;
  return FLAT_SCALE.indexOf(capitalizedNote);
};

const transposeNote = (note: string, semitones: number): string => {
  const noteIndex = getNoteIndex(note);
  if (noteIndex === -1) return note;
  const newIndex = (noteIndex + semitones + 12) % 12;
  const useFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(SHARP_SCALE[newIndex]);
  return useFlats ? FLAT_SCALE[newIndex] : SHARP_SCALE[newIndex];
};

export const transposeChord = (chord: string, semitones: number): string => {
  if (semitones === 0) return chord;
  const bassMatch = chord.match(/\/([A-G](?:#|b)?)/);
  let mainChordPart = chord;
  let bassPart = '';
  if (bassMatch) {
    mainChordPart = chord.split('/')[0];
    const bassNote = bassMatch[1];
    bassPart = '/' + transposeNote(bassNote, semitones);
  }
  const rootMatch = mainChordPart.match(/^[A-G](?:#|b)?/);
  if (!rootMatch) return chord;
  const rootNote = rootMatch[0];
  const quality = mainChordPart.substring(rootNote.length);
  return `${transposeNote(rootNote, semitones)}${quality}${bassPart}`;
};

export const transposeContent = (content: string, semitones: number): string => {
  if (semitones === 0 || !content) return content;
  const chordRegex = /([A-G](?:#|b)?(?:(?:maj|m|min|dim|aug|sus|add|M|°|\+|-)?(?:\d+)?(?:\([#b]?\d+\))?)*(?:\/[A-G](?:#|b)?)?)/g;
  return content.split('\n').map(line => {
    if (isChordLine(line)) {
      return line.replace(chordRegex, (match) => {
        if (!match.trim() || (line.includes('(') && !/^[A-G]/.test(match))) return match;
        return transposeChord(match, semitones);
      });
    }
    return line;
  }).join('\n');
};

/**
 * Divide o conteúdo em páginas de forma inteligente.
 * @param content Conteúdo da música.
 * @param linesPerPage Quantidade alvo de linhas por página.
 * @returns Array de strings, onde cada item é uma página.
 */
export const paginateContent = (content: string, linesPerPage: number = 14): string[] => {
  if (!content) return [];

  // Primeiro divide pelo marcador manual "--" em uma linha própria
  const manualBlocks = content.split(/\n\s*--\s*\n/).filter(p => p.trim());
  const finalPages: string[] = [];

  manualBlocks.forEach(block => {
    const lines = block.split('\n');
    
    // Se o bloco já cabe na página, adiciona inteiro
    if (lines.length <= linesPerPage) {
      finalPages.push(block.trim());
      return;
    }

    let currentPageLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentPageLines.push(line);

      const isLimitReached = currentPageLines.length >= linesPerPage;
      const isChord = isChordLine(line);
      const isLastLine = i === lines.length - 1;

      // Lógica Smart Split:
      // Só corta se atingiu o limite E não for uma linha de cifra (para não separar da letra abaixo)
      // Ou se for a última linha do bloco
      if ((isLimitReached && !isChord) || isLastLine) {
        finalPages.push(currentPageLines.join('\n').trim());
        currentPageLines = [];
      }
    }
    
    // Adiciona rebarba se sobrou algo
    if (currentPageLines.length > 0) {
      finalPages.push(currentPageLines.join('\n').trim());
    }
  });

  return finalPages;
};