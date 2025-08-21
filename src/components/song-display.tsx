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
        const trimmedLine = line.trim();
        
        // Se a linha estiver vazia, apenas adicione um espaço para manter a quebra de linha
        if (trimmedLine === '') {
          return <p key={lineIndex} className="mb-0">&nbsp;</p>;
        }

        // Verifica se a linha contém APENAS cifras e espaços
        const isChordLineOnly = trimmedLine.split(/\s+/).every(part => part.match(/^([A-G][b#]?(maj|min|m|dim|aug|sus)?[2-7]?)$/));

        if (isChordLineOnly) {
            return (
                <p key={lineIndex} className="font-bold text-primary mb-0">
                    {line}
                </p>
            );
        }
        
        // Tenta lidar com linhas que têm cifras e letras misturadas (inline)
        const chordsInLine = line.match(CHORD_REGEX) || [];

        if (chordsInLine.length > 0) {
            // Extrai a parte da letra, removendo as cifras
            const lyricsLine = line.replace(CHORD_REGEX, '').replace(/\s\s+/g, ' ').trim();
            const chordsAndPositions: { chord: string, pos: number }[] = [];
            
            let match;
            // Usamos uma versão da linha com caracteres não-cifra removidos para obter posições corretas
            const lineForPositions = line.replace(/[^A-G\s#bmajindimugsus2-7]/g, ' ');

            while ((match = CHORD_REGEX.exec(lineForPositions)) !== null) {
              chordsAndPositions.push({ chord: match[1], pos: match.index });
            }
            
            // Se não houver letra e não for uma linha apenas de cifras, trata como texto normal
            if (!lyricsLine && !isChordLineOnly) {
               return <p key={lineIndex} className="mb-0">{line}</p>;
            }

            return (
                <div key={lineIndex} className="relative mb-2">
                    <div className="text-primary font-bold">
                        {chordsAndPositions.map(({ chord, pos }, i) => (
                            <span key={i} style={{ position: 'absolute', left: `${pos}ch` }}>{chord}</span>
                        ))}
                    </div>
                    {/* Usamos mt-[-2px] para a letra ficar um pouco mais perto da cifra */}
                    <div className="mt-[-2px]">{lyricsLine || <>&nbsp;</>}</div>
                </div>
            );
        }

        // Se nenhuma cifra for encontrada na linha, renderiza como texto/letra normal.
        return <p key={lineIndex} className="mb-0">{line}</p>;
      })}
    </div>
  );
}
