
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
    if (text.trim() === '' && !showChords) {
        const nextLineIsAlsoEmpty = !text;
        if(nextLineIsAlsoEmpty) return <p className="mb-2">&nbsp;</p>;
        return null;
    }

    if (text.trim() === '') {
        return <p className="mb-2">&nbsp;</p>;
    }

    return (
        <p
            className={cn(
                'whitespace-pre',
                isChord ? 'font-bold text-primary mb-1' : 'mb-2'
            )}
        >
            {text}
        </p>
    );
}

export function SongDisplay({ content, className, showChords, ...props }: SongDisplayProps) {
    const lines = content.split('\\n');

    const containerClasses = cn(
        "font-code text-base leading-tight w-full",
        !showChords && "overflow-x-hidden", // Remove a rolagem horizontal quando as cifras estão ocultas
        className
    );

    return (
        <div className={containerClasses} {...props}>
            {lines.map((line, lineIndex) => (
                <Line
                    key={lineIndex}
                    text={line}
                    isChord={isChordLine(line)}
                    showChords={showChords}
                />
            ))}
        </div>
    );
}
