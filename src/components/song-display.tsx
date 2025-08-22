
import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SongDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
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

const Line = ({ text, isChord }: { text: string; isChord: boolean }) => {
    const textRef = useRef<HTMLParagraphElement>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
        const checkOverflow = () => {
            if (textRef.current) {
                const { scrollWidth, clientWidth } = textRef.current;
                if (scrollWidth > clientWidth) {
                    setScale(clientWidth / scrollWidth);
                } else {
                    setScale(1);
                }
            }
        };

        checkOverflow();
        
        // Recalcular em redimensionamento de janela
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);

    }, [text]); // Re-executar quando o texto (transposição) mudar

    const style = {
        transform: `scaleX(${scale})`,
        transformOrigin: 'left',
        whiteSpace: 'pre' as 'pre',
        width: '100%',
        display: 'inline-block'
    };

    if (text.trim() === '') {
        return <p className="mb-2">&nbsp;</p>;
    }

    return (
        <p
            ref={textRef}
            className={cn(
                'mb-2',
                isChord ? 'font-bold text-primary mb-1' : 'mb-2'
            )}
            style={scale < 1 ? style : {whiteSpace: 'pre'}}
        >
            {text}
        </p>
    );
}

export function SongDisplay({ content, className, ...props }: SongDisplayProps) {
    const lines = content.split('\n');

    return (
        <div className={cn("font-code text-base leading-tight w-full", className)} {...props}>
            {lines.map((line, lineIndex) => (
                <Line
                    key={lineIndex}
                    text={line}
                    isChord={isChordLine(line)}
                />
            ))}
        </div>
    );
}
