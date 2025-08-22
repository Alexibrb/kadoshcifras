'use client';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from './ui/button';
import { useLineHeight } from '@/hooks/use-line-height';

export function ScrollButtons() {
    const lineHeight = useLineHeight('font-code text-base leading-tight');

    const handleScroll = (direction: 'up' | 'down') => {
        if (typeof window === 'undefined') return;

        const scrollAmount = window.innerHeight - (lineHeight * 2); // Leave ~1 line of context
        
        window.scrollBy({
            top: direction === 'down' ? scrollAmount : -scrollAmount,
            behavior: 'smooth',
        });
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg"
                onClick={() => handleScroll('up')}
                aria-label="Rolar para cima"
            >
                <ArrowUp className="h-6 w-6" />
            </Button>
            <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg"
                onClick={() => handleScroll('down')}
                aria-label="Rolar para baixo"
            >
                <ArrowDown className="h-6 w-6" />
            </Button>
        </div>
    );
}
