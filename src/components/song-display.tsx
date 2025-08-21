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
    <div className={cn("font-code text-base leading-tight whitespace-pre-wrap", className)} {...props}>
      {lines.map((line, lineIndex) => {
        const chordsInLine = line.match(CHORD_REGEX) || [];
        
        // Verifica se a linha contém APENAS cifras e espaços
        const isChordLineOnly = line.trim().length > 0 && line.split(' ').every(part => part.match(CHORD_REGEX) || part.trim() === '');
        
        if (isChordLineOnly && chordsInLine.length >= 2) {
            return (
                <p key={lineIndex} className="font-bold text-primary mb-0">
                    {line}
                </p>
            );
        }
        
        // Lida com linhas que têm cifras e letras misturadas
        if (chordsInLine.length > 0) {
            const lyricsLine = line.replace(CHORD_REGEX, '').replace(/\s\s+/g, ' ').trim();
            const chordsAndPositions: { chord: string, pos: number }[] = [];
            
            let match;
            // Usamos uma versão da linha com caracteres não-cifra removidos para obter posições corretas
            const lineForPositions = line.replace(/[^A-G\s#bmajindimugsus2-7]/g, ' ');

            while ((match = CHORD_REGEX.exec(lineForPositions)) !== null) {
              chordsAndPositions.push({ chord: match[1], pos: match.index });
            }
            
            // Se não houver letra e tiver menos de 2 acordes, trata como texto normal
            if (!lyricsLine && chordsAndPositions.length < 2) {
               return <p key={lineIndex} className="mb-0">{line || <>&nbsp;</>}</p>;
            }

            return (
                <div key={lineIndex} className="relative mb-2">
                    <div className="text-primary font-bold">
                        {chordsAndPositions.map(({ chord, pos }, i) => (
                            <span key={i} style={{ position: 'absolute', left: `${pos}ch` }}>{chord}</span>
                        ))}
                    </div>
                    <div className="mt-[-2px]">{lyricsLine || <>&nbsp;</>}</div>
                </div>
            );
        }

        // Lida com linhas sem cifras (trata como texto/letra normal)
        return <p key={lineIndex} className="mb-0">{line || <>&nbsp;</>}</p>;
      })}
    </div>
  );
}