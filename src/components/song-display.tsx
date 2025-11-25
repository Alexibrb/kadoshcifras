
import React from 'react';
import { cn } from '@/lib/utils';
import { isChordLine } from '@/lib/music';

interface SongDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  showChords: boolean;
}

const Line = ({ text, isChord, showChords, style }: { text: string; isChord: boolean, showChords: boolean, style: React.CSSProperties }) => {
    if (isChord && !showChords) {
        return null;
    }
    
    if (text.trim() === '' && !showChords) {
       return <p className="mb-0">&nbsp;</p>;
    }

    if (text.trim() === '') {
        return <p className="mb-2">&nbsp;</p>;
    }

    if (text.startsWith('[title]')) {
        const fullTitle = text.replace('[title]', '').trim();
        const artistMatch = fullTitle.match(/\[artist\](.*)/);
        const artist = artistMatch ? artistMatch[1] : '';
        const title = artistMatch ? fullTitle.replace(artistMatch[0], '').trim() : fullTitle;

        return (
            <div className="mb-4 mt-6 first:mt-0">
                <h2 className="text-2xl font-bold text-primary leading-tight" style={{ color: 'var(--custom-chord-color)' }}>
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
    
    // Combina o estilo recebido (que inclui fontSize) com a cor apropriada.
    const finalStyle = isChord 
        ? { ...style, color: 'var(--chords-color, hsl(var(--primary)))' }
        : { ...style, color: 'var(--lyrics-color, hsl(var(--foreground)))' };

    return (
        <p
            style={finalStyle}
            className={cn(
                'whitespace-pre-wrap', 
                'break-words', 
                isChord ? 'font-bold mb-1' : 'mb-2'
            )}
        >
            {text}
        </p>
    );
}

export function SongDisplay({ content, className, showChords, style, ...props }: SongDisplayProps) {
    const lines = content.split('\n');

    const containerClasses = cn(
        "font-code leading-tight w-full",
        className
    );
    
    return (
        <div className={containerClasses} {...props} style={style}>
            {lines.map((line, lineIndex) => {
                const isChord = isChordLine(line);
                if (isChord && !showChords) {
                    return null;
                }
                
                if(line.trim() === '' && !showChords && lineIndex > 0 && isChordLine(lines[lineIndex - 1])) {
                    return null;
                }

                return (
                    <Line
                        key={lineIndex}
                        text={line}
                        isChord={isChord}
                        showChords={showChords}
                        style={style || {}} // Passa o objeto de estilo completo para cada linha
                    />
                );
            })}
        </div>
    );
}
