
import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SongDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  showChords: boolean;
}

// Regex expandido para detectar uma gama maior de acordes
const CHORD_REGEX = /^[A-G](b|#)?(m|maj|dim|aug|sus|add)?(2|4|5|6|7|9|11|13)?(b5|#5|b9|#9|b11|#11|b13|#13)?(maj7|M7)?(m7)?(sus4)?(sus2)?(add9)?(add11)?(add13)?(\/([A-G](b|#)?))?((°))?$/;
const LETTER_AND_NUMBER_REGEX = /^(?=.*[A-Za-z])(?=.*[0-9])/;


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

const Line = ({ text, isChord, showChords }: { text: string; isChord: boolean, showChords: boolean }) => {
    const textRef = useRef<HTMLParagraphElement>(null);
    const [fontSize, setFontSize] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
        const checkOverflow = () => {
            if (textRef.current) {
                const { scrollWidth, clientWidth } = textRef.current;
                if (scrollWidth > clientWidth) {
                    const currentFontSize = parseFloat(window.getComputedStyle(textRef.current).fontSize);
                    setFontSize(currentFontSize * (clientWidth / scrollWidth));
                } else {
                    setFontSize(undefined); // Reseta se não houver overflow
                }
            }
        };

        checkOverflow();
        
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);

    }, [text]); // Re-executar quando o texto (transposição) mudar

    if (isChord && !showChords) {
        return null;
    }
    
    if (text.trim() === '') {
        return <p className="mb-2">&nbsp;</p>;
    }

    return (
        <p
            ref={textRef}
            className={cn(
                'whitespace-pre',
                isChord ? 'font-bold text-primary mb-1' : 'mb-2'
            )}
            style={{ fontSize: fontSize ? `${fontSize}px` : undefined }}
        >
            {text}
        </p>
    );
}

export function SongDisplay({ content, className, showChords, ...props }: SongDisplayProps) {
    const lines = content.split('\n');

    return (
        <div className={cn("font-code text-base leading-tight w-full", className)} {...props}>
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
