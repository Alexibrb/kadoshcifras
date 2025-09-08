
import React from 'react';
import { cn } from '@/lib/utils';
import { isChordLine } from '@/lib/music';

interface SongDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  showChords: boolean;
}

const Line = ({ text, isChord, showChords }: { text: string; isChord: boolean, showChords: boolean }) => {
    if (isChord && !showChords) {
        return null;
    }
    
    // Evita que uma linha em branco ocupe espaço desnecessário quando as cifras estão ocultas.
    // e a proxima linha também está vazia
    if (text.trim() === '' && !showChords) {
       return <p className="mb-0">&nbsp;</p>;
    }

    if (text.trim() === '') {
        return <p className="mb-2">&nbsp;</p>;
    }

    // Verifica se a linha é um título de música formatado
    if (text.startsWith('[title]')) {
        const fullTitle = text.replace('[title]', '').trim();
        const artistMatch = fullTitle.match(/\(([^)]+)\)$/);
        const artist = artistMatch ? artistMatch[1] : '';
        const title = artistMatch ? fullTitle.replace(artistMatch[0], '').trim() : fullTitle;

        return (
            <div className="mb-4 mt-6 first:mt-0">
                <h2 className="text-2xl font-bold text-primary leading-tight">
                    {title}
                </h2>
                {artist && (
                    <p className="text-base text-muted-foreground font-normal">
                        {artist}
                    </p>
                )}
            </div>
        );
    }

    return (
        <p
            className={cn(
                'whitespace-pre-wrap', // Permite que o texto quebre a linha, mas preserva os espaços
                'break-words', // Força a quebra de palavras longas
                isChord ? 'font-bold text-primary mb-1' : 'mb-2'
            )}
        >
            {text}
        </p>
    );
}

export function SongDisplay({ content, className, showChords, ...props }: SongDisplayProps) {
    const lines = content.split('\n');

    const containerClasses = cn(
        "font-code text-base leading-tight w-full",
        className
    );

    return (
        <div className={containerClasses} {...props}>
            {lines.map((line, lineIndex) => {
                const isChord = isChordLine(line);
                // Quando as cifras estão ocultas, não renderize a linha de acordes.
                if (isChord && !showChords) {
                    return null;
                }
                
                // Evita renderizar um espaço extra se a linha de letra estiver vazia
                // e a linha de cifra acima dela foi ocultada.
                if(line.trim() === '' && !showChords && lineIndex > 0 && isChordLine(lines[lineIndex -1])) {
                    return null;
                }

                return (
                    <Line
                        key={lineIndex}
                        text={line}
                        isChord={isChord}
                        showChords={showChords}
                    />
                );
            })}
        </div>
    );
}

    

