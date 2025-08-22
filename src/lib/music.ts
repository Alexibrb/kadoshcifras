'use client';

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_REGEX = /([A-G](?:#|b)?)/;
const CHORD_REGEX = /\b([A-G](?:#|b)?(?:m|maj|dim|aug|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:b5|#5|b9|#9|b11|#11|b13|#13)?(?:maj7|M7)?(?:m7)?(?:sus4)?(?:sus2)?(?:add9)?(?:add11)?(?:add13)?(?:°)?(?:\/[A-G](?:#|b)?)?)\b/g;

const getNoteIndex = (note: string): number => {
  let normalizedNote = note;
  // Use sharp scale for reference
  if (note.includes('b')) {
    const flatIndex = FLAT_SCALE.indexOf(note);
    if(flatIndex !== -1) {
        normalizedNote = SHARP_SCALE[flatIndex];
    }
  }
  return SHARP_SCALE.indexOf(normalizedNote);
};

const transposeNote = (note: string, semitones: number): string => {
    const noteIndex = getNoteIndex(note);
    if (noteIndex === -1) {
        return note;
    }
    const newIndex = (noteIndex + semitones + 12) % 12;
    return SHARP_SCALE[newIndex];
}

export const transposeChord = (chord: string, semitones: number): string => {
  if (semitones === 0) return chord;

  const parts = chord.split('/');
  const mainChord = parts[0];
  const bassNote = parts.length > 1 ? parts[1] : null;

  const rootMatch = mainChord.match(NOTE_REGEX);
  if (!rootMatch) return chord;
  
  const rootNote = rootMatch[1];
  const quality = mainChord.substring(rootNote.length);

  const newRoot = transposeNote(rootNote, semitones);
  
  let newBass = '';
  if (bassNote) {
      newBass = '/' + transposeNote(bassNote, semitones);
  }

  return `${newRoot}${quality}${newBass}`;
};

export const transposeContent = (content: string, semitones: number): string => {
  if (semitones === 0) return content;
  return content.replace(CHORD_REGEX, (match) => {
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
