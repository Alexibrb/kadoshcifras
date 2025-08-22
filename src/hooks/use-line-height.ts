'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useLineHeight(className: string): number {
  const [lineHeight, setLineHeight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const measureLineHeight = useCallback(() => {
    if (ref.current) {
      const computedStyle = getComputedStyle(ref.current);
      const lh = parseFloat(computedStyle.lineHeight);
      setLineHeight(lh || 0);
    }
  }, []);

  useEffect(() => {
    measureLineHeight();
    window.addEventListener('resize', measureLineHeight);
    return () => {
      window.removeEventListener('resize', measureLineHeight);
    };
  }, [measureLineHeight]);

  // Hidden element used for measurement
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('line-height-measurer')) {
      const measurer = document.createElement('div');
      measurer.id = 'line-height-measurer';
      measurer.style.position = 'absolute';
      measurer.style.left = '-9999px';
      measurer.style.top = '-9999px';
      measurer.style.visibility = 'hidden';
      measurer.className = className;
      measurer.textContent = 'A'; // Any character to ensure height
      document.body.appendChild(measurer);
      // @ts-ignore
      ref.current = measurer;
      measureLineHeight();
    }
    
    return () => {
        const measurer = document.getElementById('line-height-measurer');
        if (measurer) {
            document.body.removeChild(measurer);
        }
    }
  }, [className, measureLineHeight]);

  return lineHeight;
}
