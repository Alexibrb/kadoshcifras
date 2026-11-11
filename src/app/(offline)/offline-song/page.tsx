'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, PanelTopClose, PanelTopOpen, Music, Loader2, Play, Pause, X, Sun, FileDown, FileText, Mic, MicOff } from 'lucide-react';
import { SongDisplay } from '@/components/song-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import Link from 'next/link';
import { PedalSettings, ColorSettings, Song } from '@/types';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { transposeChord, transposeContent, isChordLine, paginateContent, smartWrapContent } from '@/lib/music';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function OfflineSongPage() {
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const requestRef = useRef<number>(null);
  const lastScrollTime = useRef<number>(0);
  const scrollPosRef = useRef<number>(0); 
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastVoiceCommandTime = useRef<number>(0);

  const [song, setSong] = useState<Song | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [fontSize] = useLocalStorage('song-font-size', 14);
  const [linesPerPage] = useLocalStorage('song-lines-per-page', 14);
  const [maxChars] = useLocalStorage('song-max-chars', 0);
  const [showChords, setShowChords] = useLocalStorage('song-show-chords', true);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(10);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [transpose, setTranspose] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [finalColorSettings, setFinalColorSettings] = useState<ColorSettings | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const [pedalSettings] = useLocalStorage<PedalSettings>('pedal-settings', {
    pedalType: '4-buttons',
    prevPage: ',',
    nextPage: '.',
    prevSong: '[',
    nextSong: ']',
  });

  const requestWakeLock = useCallback(async () => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setIsWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => setIsWakeLockActive(false));
      } catch (err) {
        console.warn('Wake Lock request failed');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const now = Date.now();
      if (now - lastVoiceCommandTime.current < 800) return;

      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript.toLowerCase();
      }

      if (transcript.includes('pp') || transcript.includes('pê pê') || transcript.includes('pepe')) {
        api?.scrollNext();
        lastVoiceCommandTime.current = now;
      } else if (transcript.includes('pa') || transcript.includes('pê á') || transcript.includes('pea')) {
        api?.scrollPrev();
        lastVoiceCommandTime.current = now;
      } else if (transcript.includes('rolar')) {
        setIsContinuousMode(true);
        setIsAutoScrolling(true);
        setIsPanelVisible(false);
        lastVoiceCommandTime.current = now;
      } else if (transcript.includes('parar')) {
        setIsAutoScrolling(false);
        lastVoiceCommandTime.current = now;
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current?.isActive) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognitionRef.current = { instance: recognition, isActive: false };
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.isActive = false;
        recognitionRef.current.instance.stop();
      }
    };
  }, [api]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast({ variant: "destructive", title: "Não Suportado", description: "Voz não disponível neste navegador." });
      return;
    }
    if (isVoiceActive) {
      recognitionRef.current.isActive = false;
      recognitionRef.current.instance.stop();
      setIsVoiceActive(false);
      toast({ title: "Voz Desativada" });
    } else {
      recognitionRef.current.isActive = true;
      try {
        recognitionRef.current.instance.start();
        setIsVoiceActive(true);
        toast({ title: "Voz Ativada", description: "Diga 'PP' ou 'PA' para navegar." });
      } catch (e) {}
    }
  };

  const animateScroll = useCallback((time: number) => {
    if (lastScrollTime.current > 0 && scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (viewport) {
            const deltaTime = (time - lastScrollTime.current) / 1000;
            const pixelsToMove = (scrollSpeed * 2) * deltaTime;
            scrollPosRef.current += pixelsToMove;
            if (scrollPosRef.current >= 1) {
                viewport.scrollTop += Math.floor(scrollPosRef.current);
                scrollPosRef.current -= Math.floor(scrollPosRef.current);
            }
        }
    }
    lastScrollTime.current = time;
    requestRef.current = requestAnimationFrame(animateScroll);
  }, [scrollSpeed]);

  useEffect(() => {
    if (isAutoScrolling) {
        lastScrollTime.current = performance.now();
        requestRef.current = requestAnimationFrame(animateScroll);
    } else if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isAutoScrolling, animateScroll]);

  useEffect(() => {
    setIsClient(true);
    requestWakeLock();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const trans = params.get('transpose');
    if (trans) setTranspose(parseInt(trans, 10));
    
    if (id) {
        const stored = localStorage.getItem(`offline-song-${id}`);
        if (stored) {
            setSong(JSON.parse(stored));
        } else {
            setError("Música não encontrada offline.");
        }
    } else {
        setError("ID da música não fornecido.");
    }
    setLoading(false);

    const isDarkMode = document.documentElement.classList.contains('dark');
    const storedColors = localStorage.getItem('user-color-settings');
    if (storedColors) setFinalColorSettings(JSON.parse(storedColors));
    else setFinalColorSettings({ lyricsColor: isDarkMode ? '#FFF' : '#000', chordsColor: isDarkMode ? '#F59E0B' : '#000' });
    
    return () => { if (wakeLockRef.current) wakeLockRef.current.release(); };
  }, [requestWakeLock]);

  const songParts = useMemo(() => {
    if (!song) return [];
    const wrapped = smartWrapContent(song.content, maxChars);
    return paginateContent(wrapped, linesPerPage);
  }, [song, maxChars, linesPerPage]);

  const currentKey = useMemo(() => song?.key ? transposeChord(song.key, transpose) : null, [song, transpose]);

  const stopAutoScroll = useCallback(() => {
    setIsAutoScrolling(false);
    setIsContinuousMode(false);
    setIsExitDialogOpen(false);
    setTimeout(() => {
        if (api) api.scrollTo(currentPageIndex, false);
        containerRef.current?.focus();
    }, 100);
  }, [api, currentPageIndex]);

  useEffect(() => {
    if (!api || isContinuousMode) return;
    const onSelect = () => setCurrentPageIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); }
  }, [api, isContinuousMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const { nextSong, prevSong, nextPage, prevPage, pedalType } = pedalSettings;
    if (pedalType === '4-buttons' && e.key === nextSong) {
      e.preventDefault();
      if (isExitDialogOpen) stopAutoScroll();
      else if (!isContinuousMode) { setIsContinuousMode(true); setIsAutoScrolling(true); setIsPanelVisible(false); }
      else setIsExitDialogOpen(true);
      return;
    }
    if (isContinuousMode) {
        if (e.key === prevSong || (pedalType === '2-buttons' && e.key === nextPage)) {
            e.preventDefault(); setIsAutoScrolling(!isAutoScrolling);
        }
    } else {
        if (e.key === nextPage || e.key === "ArrowRight") { e.preventDefault(); api?.scrollNext(); }
        else if (e.key === prevPage || e.key === "ArrowLeft") { e.preventDefault(); api?.scrollPrev(); }
    }
  }, [api, pedalSettings, isAutoScrolling, isContinuousMode, stopAutoScroll, isExitDialogOpen]);

  if (loading || !isClient || !finalColorSettings) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (error || !song) return <div className="flex flex-col items-center justify-center h-screen"><p className="text-destructive mb-4">{error}</p><Button asChild><Link href="/songs"><ArrowLeft className="mr-2" />Voltar</Link></Button></div>;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col p-4 md:p-8 h-screen outline-none bg-background overflow-hidden relative" onKeyDownCapture={handleKeyDown} tabIndex={0}>
      <Card className={cn("mb-4 bg-accent/10 transition-all", isPanelVisible ? "p-4 space-y-4" : "p-1.5")}>
        {isPanelVisible ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <Button asChild variant="outline" size="icon" className="shrink-0"><Link href="/songs"><ArrowLeft className="h-4 w-4" /></Link></Button>
              <div className="text-center flex-1 min-w-0">
                <h1 className="text-xl font-bold font-headline leading-tight break-words">{song.title} {currentKey && <span className="text-primary ml-1">({currentKey})</span>}</h1>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Badge variant="outline">Offline</Badge>
                  <Sun className={cn("h-3 w-3 transition-opacity", isWakeLockActive ? "text-orange-500" : "text-muted-foreground opacity-30")} />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{isWakeLockActive ? 'Tela Ativa' : 'Tela Normal'}</span>
                  <Badge variant="secondary" className="text-[12px] h-5 font-bold"><FileText className="h-3 w-3 mr-1" /> {currentPageIndex + 1} / {songParts.length}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button onClick={() => setIsPanelVisible(false)} variant="ghost" size="icon"><PanelTopClose className="h-5 w-5" /></Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <div className="flex items-center gap-1 border rounded-md p-1 bg-background h-10 w-full sm:w-48">
                    <Button variant="ghost" size="icon" onClick={() => setTranspose(t => Math.max(-12, t-1))}><Minus className="h-4 w-4" /></Button>
                    <Badge variant="secondary" className="flex-1 text-center">Tom: {currentKey || transpose}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => setTranspose(t => Math.min(12, t+1))}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center justify-between border rounded-md p-1 px-3 bg-background h-10 w-full sm:w-44">
                    <Label className="text-xs">Cifras</Label>
                    <Switch checked={showChords} onCheckedChange={setShowChords} />
                </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between min-h-8 py-1 gap-2">
            <Button asChild variant="outline" size="icon" className="h-8 w-8 shrink-0"><Link href="/songs"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div className="flex-1 flex flex-col items-center justify-center px-2 min-w-0">
                <h1 className="text-sm font-bold w-full text-center break-words">{song.title} {currentKey && <span className="text-primary">({currentKey})</span>}</h1>
                <div className="text-[12px] font-bold text-blue-600 uppercase mt-1 flex items-center"><FileText className="h-3 w-3 mr-1" /> {currentPageIndex + 1} / {songParts.length}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isVoiceActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse mr-1" />}
              <Button onClick={() => setIsPanelVisible(true)} variant="ghost" size="icon" className="h-8 w-8"><PanelTopOpen className="h-5 w-5" /></Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {!isContinuousMode && showChords && (
          <div className="absolute inset-0 z-10 flex pointer-events-none">
            <div 
                className="w-[30%] h-full cursor-pointer pointer-events-auto" 
                onClick={(e) => { e.stopPropagation(); api?.scrollPrev(); }} 
                title="Página Anterior" 
            />
            <div 
                className="w-[70%] h-full cursor-pointer pointer-events-auto" 
                onClick={(e) => { e.stopPropagation(); api?.scrollNext(); }} 
                title="Próxima Página" 
            />
          </div>
        )}

        {isContinuousMode || !showChords ? (
          <ScrollArea ref={scrollAreaRef} className="h-full bg-white dark:bg-black">
              <div className="p-4 md:p-8 pb-48">
                {songParts.map((part, idx) => (
                    <div key={idx} data-section-index={idx}>
                        <SongDisplay 
                            style={{ fontSize: `${fontSize}px`, '--lyrics-color': finalColorSettings.lyricsColor, '--chords-color': finalColorSettings.chordsColor } as React.CSSProperties}
                            content={transposeContent(part, transpose)}
                            showChords={showChords} 
                        />
                    </div>
                ))}
              </div>
          </ScrollArea>
        ) : (
          <Carousel className="w-full h-full" setApi={setApi}>
            <CarouselContent className="h-full">
              {songParts.map((part, index) => (
                <CarouselItem key={index} className="h-full">
                  <ScrollArea className="h-full p-4 md:p-8 bg-white dark:bg-black">
                    <SongDisplay 
                        style={{ fontSize: `${fontSize}px`, '--lyrics-color': finalColorSettings.lyricsColor, '--chords-color': finalColorSettings.chordsColor } as React.CSSProperties}
                        content={transposeContent(part, transpose)}
                        showChords={showChords} 
                    />
                  </ScrollArea>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t z-50">
          <div className="max-w-xl mx-auto flex items-center gap-4 p-2 rounded-lg border bg-muted/20">
                <Button onClick={toggleVoice} variant="ghost" size="icon" className={cn("h-9 w-9 shrink-0", isVoiceActive && "text-primary bg-primary/10 animate-pulse")}>
                  {isVoiceActive ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                {!isContinuousMode && showChords ? (
                    <Button onClick={() => { setIsContinuousMode(true); setIsAutoScrolling(true); setIsPanelVisible(false); }} className="h-9 flex-1 sm:w-36 gap-2"><Play className="h-4 w-4" />Iniciar</Button>
                ) : (
                    <div className="flex gap-2 flex-1 sm:flex-none">
                        <Button variant={isAutoScrolling ? "destructive" : "default"} onClick={() => setIsAutoScrolling(!isAutoScrolling)} className="h-9 flex-1 sm:w-36">{isAutoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                        {showChords && <Button variant="outline" onClick={() => setIsExitDialogOpen(true)} className="h-9 w-12"><X className="h-4 w-4" /></Button>}
                    </div>
                )}
              {(isContinuousMode || !showChords) && (
                  <div className="flex-1 flex items-center gap-3">
                      <Slider value={[scrollSpeed]} onValueChange={(val) => setScrollSpeed(val[0])} max={100} min={1} />
                      <span className="text-[10px] font-mono font-bold w-10 text-primary">{scrollSpeed}</span>
                  </div>
              )}
          </div>
      </div>

      <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Sair do Modo Rolagem?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsExitDialogOpen(false)}>Não</AlertDialogCancel>
                  <AlertDialogAction onClick={stopAutoScroll}>Sim</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
