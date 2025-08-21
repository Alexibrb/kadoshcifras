import React from 'react';
import { cn } from '@/lib/utils';

interface SongDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
}

// Regex para detectar acordes comuns (ex: C, Gm, F#m7, Db, etc.)
// E palavras que podem ser confundidas com acordes.
const CHORD_LIKE_REGEX = /^\b([A-G][b#]?(maj|min|m|dim|aug|sus)?[2-7]?)\b$/;
const LYRICS_REGEX = /[a-zA-Z]/;

export function SongDisplay({ content, className, ...props }: SongDisplayProps) {
  const lines = content.split('\n');

  const isChordLine = (line: string): boolean => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      return false;
    }
    const parts = trimmedLine.split(/\s+/);
    // Para ser uma linha de cifra, não pode conter muitas palavras que não são cifras.
    // E deve ter pelo menos um item que parece cifra.
    const chordParts = parts.filter(p => CHORD_LIKE_REGEX.test(p));
    const nonChordParts = parts.filter(p => !CHORD_LIKE_REGEX.test(p) && LYRICS_REGEX.test(p));
    
    // É uma linha de cifra se a maioria das "palavras" são cifras e tem pouca letra.
    return chordParts.length > 0 && nonChordParts.length < chordParts.length && nonChordParts.length <= 1;
  };

  return (
    <div className={cn("font-code text-base leading-tight whitespace-pre-wrap", className)} {...props}>
      {lines.map((line, lineIndex) => {
        // Se a linha estiver vazia, apenas adicione um espaço para manter a quebra de linha
        if (line.trim() === '') {
          return <p key={lineIndex} className="mb-2">&nbsp;</p>;
        }

        if (isChordLine(line)) {
            return (
                <p key={lineIndex} className="font-bold text-primary mb-1">
                    {line}
                </p>
            );
        }
        
        // Se nenhuma cifra for encontrada na linha, renderiza como texto/letra normal.
        return <p key={lineIndex} className="mb-2">{line}</p>;
      })}
    </div>
  );
}
