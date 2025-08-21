'use client';

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const CHORD_REGEX = /\[([^\]]+)\]/g;

const normalizeChord = (chord: string): { root: string, quality: string } => {
  let root = chord.charAt(0);
  let quality = '';

  if (chord.length > 1 && (chord.charAt(1) === '#' || chord.charAt(1) === 'b')) {
    root += chord.charAt(1);
    quality = chord.substring(2);
  } else {
    quality = chord.substring(1);
  }
  return { root, quality };
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
  
  const { root, quality } = normalizeChord(chord);
  const noteIndex = getNoteIndex(root);

  if (noteIndex === -1) return chord;

  const newIndex = (noteIndex + semitones + 12) % 12;
  const newRoot = SHARP_SCALE[newIndex];

  return `${newRoot}${quality}`;
};

export const transposeContent = (content: string, semitones: number): string => {
  if (semitones === 0) return content;
  return content.replace(CHORD_REGEX, (match, chord) => {
    return `[${transposeChord(chord, semitones)}]`;
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
