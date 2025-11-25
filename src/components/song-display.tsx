
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
    
    const chordStyle = { 
        color: isChord ? 'var(--custom-chord-color)' : 'var(--custom-text-color)' 
    };

    return (
        <p
            style={chordStyle}
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

export function SongDisplay({ content, className, showChords, ...props }: SongDisplayProps) {
    const lines = content.split('\n');

    const containerClasses = cn(
        "font-code text-base leading-tight w-full",
        className
    );
    
    const textStyle = {
      color: 'var(--custom-text-color)'
    }

    return (
        <div className={containerClasses} {...props} style={textStyle}>
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
                    />
                );
            })}
        </div>
    );
}
