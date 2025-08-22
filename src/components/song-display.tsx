
import React from 'react';
import { cn } from '@/lib/utils';

interface SongDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
}

// Regex expandido para detectar uma gama maior de acordes
const CHORD_REGEX = /^[A-G](b|#)?(m|maj|dim|aug|sus|add)?(2|4|5|6|7|9|11|13)?(b5|#5|b9|#9|b11|#11|b13|#13)?(maj7|M7)?(m7)?(sus4)?(sus2)?(add9)?(add11)?(add13)?(\/([A-G](b|#)?))?((°))?$/;
const LETTER_AND_NUMBER_REGEX = /^(?=.*[A-Za-z])(?=.*[0-9])/;

export function SongDisplay({ content, className, ...props }: SongDisplayProps) {
  const lines = content.split('\n');

  const isChordLine = (line: string): boolean => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      return false;
    }
    const parts = trimmedLine.split(/\s+/);
    // Para ser uma linha de cifra, todas as "palavras" devem ser acordes válidos ou conter letras e números.
    const areAllPartsChords = parts.every(p => 
      CHORD_REGEX.test(p.replace('M', 'maj')) || LETTER_AND_NUMBER_REGEX.test(p)
    );
    
    return areAllPartsChords;
  };

  return (
    <div className={cn("font-code text-base leading-tight whitespace-pre-wrap", className)} {...props}>
      {lines.map((line, lineIndex) => {
        if (line.trim() === '') {
          return <p key={lineIndex} className="mb-2">&nbsp;</p>;
        }

        if (isChordLine(line)) {
            return (
                <p key={lineIndex} className="font-bold text-primary mb-1 overflow-hidden">
                    <span className="inline-block transform origin-left" style={{ transform: 'scaleX(1)', textWrap: 'nowrap' }}>{line}</span>
                </p>
            );
        }
        
        return <p key={lineIndex} className="mb-2">{line}</p>;
      })}
    </div>
  );
}
