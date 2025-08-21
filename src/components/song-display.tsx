import React from 'react';
import { cn } from '@/lib/utils';

interface SongDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
}

// Regex para detectar acordes comuns automaticamente (ex: C, Gm, F#m7, Db, etc.)
const CHORD_REGEX = /\b([A-G][b#]?(maj|min|m|dim|aug|sus)?[2-7]?)\b/g;

export function SongDisplay({ content, className, ...props }: SongDisplayProps) {
  const lines = content.split('\n');

  return (
    <div className={cn("font-code text-base leading-normal whitespace-pre-wrap", className)} {...props}>
      {lines.map((line, lineIndex) => {
        // Verifica se a linha contém apenas cifras e espaços
        const isChordLine = line.trim().length > 0 && line.split(' ').every(part => part.match(CHORD_REGEX) || part.trim() === '');
        
        if (isChordLine) {
            return (
                <p key={lineIndex} className="font-bold text-primary mb-1">
                    {line}
                </p>
            );
        }
        
        // Handle lines with chords and lyrics
        if (line.match(CHORD_REGEX)) {
            const lyricsLine = line.replace(CHORD_REGEX, '').replace(/\s\s+/g, ' ').trim();
            const chordsAndPositions: { chord: string, pos: number }[] = [];
            
            let match;
            let lastIndex = 0;
            const lineWithChordsOnly = line.replace(/[^A-G\s#bmajindimugsus2-7]/g, ' ');

            while ((match = CHORD_REGEX.exec(lineWithChordsOnly)) !== null) {
              chordsAndPositions.push({ chord: match[1], pos: match.index });
            }

            return (
                <div key={lineIndex} className="relative mb-4">
                    <div className="text-primary font-bold">
                        {chordsAndPositions.map(({ chord, pos }, i) => (
                            <span key={i} style={{ position: 'absolute', left: `${pos}ch` }}>{chord}</span>
                        ))}
                    </div>
                    <div className="mt-[-2px]">{lyricsLine || <>&nbsp;</>}</div>
                </div>
            );
        }

        // Handle lines without chords (treat as plain text/lyrics)
        return <p key={lineIndex} className="mb-1">{line || <>&nbsp;</>}</p>;
      })}
    </div>
  );
}
