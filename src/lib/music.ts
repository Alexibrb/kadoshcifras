
'use client';

/**
 * Verifica se uma linha de texto consiste principalmente de acordes.
 */
export const isChordLine = (line: string): boolean => {
  const trimmedLine = line.trim();
  if (!trimmedLine) return false;

  // 1. Remove anotações comuns que não são acordes (ex: [Refrão], (2x))
  const lineWithoutAnnotations = trimmedLine.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
  if (!lineWithoutAnnotations) return true;

  // 2. Remove acordes potenciais e vê o que sobra.
  // Expressão regular robusta para capturar acordes, incluindo tensões e baixos.
  const chordRegex = /([A-G](?:#|b)?(?:m|M|maj|min|dim|aug|sus|add|°|\+|-)?(?:\d+)?(?:\([#b]?\d+\))?(?:\/[A-G](?:#|b)?)?)/g;
  const withoutChords = lineWithoutAnnotations.replace(chordRegex, '');

  // 3. Limpa caracteres comuns em linhas de cifras (barras, números, pontos, espaços, hifens)
  const cleanLine = withoutChords.replace(/[\s/|\d.x-]/gi, '');

  // 4. Se sobrar quase nada, é uma linha de cifras.
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
 * Quebra o conteúdo de forma inteligente para manter cifras alinhadas sem cortar palavras.
 */
export const smartWrapContent = (content: string, maxChars: number): string => {
  if (!maxChars || maxChars <= 0) return content;
  
  const lines = content.split('\n');
  const result: string[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Ignora marcadores especiais de cabeçalho
    if (line.startsWith('[title]')) {
      result.push(line);
      i++;
      continue;
    }

    // Preserva linhas vazias
    if (line.trim() === '') {
      result.push('');
      i++;
      continue;
    }

    if (isChordLine(line)) {
      // Coleta linhas de cifras consecutivas (ex: Intro ou solos com múltiplas linhas)
      const chordLines: string[] = [];
      while (i < lines.length && isChordLine(lines[i])) {
        chordLines.push(lines[i]);
        i++;
      }
      
      // Busca a próxima linha de letra pareada (pulando apenas linhas vazias)
      let lyricLine: string | null = null;
      let tempI = i;
      while (tempI < lines.length && lines[tempI].trim() === '') {
        tempI++;
      }
      
      // Se encontramos uma linha de letra (não é cifra, nem cabeçalho, nem vazia)
      if (tempI < lines.length && !isChordLine(lines[tempI]) && !lines[tempI].startsWith('[title]')) {
        lyricLine = lines[tempI];
        // Avança o ponteiro principal para ignorar as linhas vazias e a linha de letra já processada
        i = tempI + 1;
      }

      if (lyricLine) {
        // Bloco de Cifras + Letra: Quebra ambos juntos intercaladamente
        let start = 0;
        const maxLength = Math.max(...chordLines.map(l => l.length), lyricLine.length);
        
        while (start < maxLength) {
          let end = start + maxChars;
          if (end < maxLength) {
            // Busca o último espaço na letra para não quebrar palavras ao meio
            const subLyric = lyricLine.substring(start, end + 1);
            const lastSpace = subLyric.lastIndexOf(' ');
            if (lastSpace > 0) {
              end = start + lastSpace;
            }
          }
          
          // Adiciona os pedaços das cifras (se houver conteúdo nesse chunk)
          chordLines.forEach(cl => {
            const part = cl.substring(start, end).trimEnd();
            if (part !== '') {
              result.push(part);
            }
          });
          
          // Adiciona o pedaço da letra correspondente
          result.push(lyricLine.substring(start, end).trimEnd());
          
          start = end;
          // Pula o espaço inicial no próximo chunk de letra se houver
          if (lyricLine[start] === ' ') start++;
        }
      } else {
        // Apenas cifras (Intro, Solo, etc.) - Quebra normalmente sem par
        chordLines.forEach(cl => {
          let start = 0;
          while (start < cl.length) {
            let end = start + maxChars;
            result.push(cl.substring(start, end).trimEnd());
            start = end;
          }
        });
      }
    } else {
       // Linha de letra isolada (sem cifras acima)
       let start = 0;
       while (start < line.length) {
         let end = start + maxChars;
         if (end < line.length) {
           const lastSpace = line.substring(start, end + 1).lastIndexOf(' ');
           if (lastSpace > 0) end = start + lastSpace;
         }
         result.push(line.substring(start, end).trimEnd());
         start = end;
         if (line[start] === ' ') start++;
       }
       i++;
    }
  }
  
  return result.join('\n');
};

/**
 * Divide o conteúdo em páginas de forma inteligente.
 */
export const paginateContent = (content: string, linesPerPage: number = 14): string[] => {
  if (!content) return [];

  const manualBlocks = content.split(/\n\s*--\s*\n/).filter(p => p.trim());
  const finalPages: string[] = [];

  manualBlocks.forEach(block => {
    const lines = block.split('\n');
    
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

      if ((isLimitReached && !isChord) || isLastLine) {
        finalPages.push(currentPageLines.join('\n').trim());
        currentPageLines = [];
      }
    }
    
    if (currentPageLines.length > 0) {
      finalPages.push(currentPageLines.join('\n').trim());
    }
  });

  return finalPages;
};
