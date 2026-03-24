
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Song, PedalSettings } from '@/types';
import { ArrowLeft, Minus, Plus, PanelTopClose, PanelTopOpen, Play, Pause, X, Loader2, FileDown, Sun } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { transposeContent, isChordLine } from '@/lib/music';
import { SongDisplay } from '@/components/song-display';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/hooks/use-auth';
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

export default function SongPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const fromSetlistId = searchParams.get('fromSetlist');
  const initialTranspose = parseInt(searchParams.get('transpose') || '0', 10);
  const { toast } = useToast();

  const { appUser, loading: authLoading } = useAuth();
  const { data: song, loading: loadingSong } = useFirestoreDocument<Song>('songs', appUser?.isApproved ? songId : null);
  
  const [pedalSettings] = useLocalStorage<PedalSettings>('pedal-settings', { 
    pedalType: '4-buttons',
    prevPage: ',', 
    nextPage: '.', 
    prevSong: '[', 
    nextSong: ']' 
  });
  
  const [isClient, setIsClient] = useState(false);
  const [transpose, setTranspose] = useState(initialTranspose);
  const [showChords, setShowChords] = useLocalStorage('song-show-chords', true);
  const [api, setApi] = useState<CarouselApi>();
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [isPanelVisible, setIsPanelVisible] = useLocalStorage('song-panel-visible', false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  
  const wakeLockRef = useRef<any>(null);
  const lastScrollTime = useRef<number>(0);
  const scrollPosRef = useRef<number>(0);
  const requestRef = useRef<number>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const finalFontSize = appUser?.fontSize ?? 14;

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
    setIsClient(true);
    requestWakeLock();
    if (containerRef.current) containerRef.current.focus();
    return () => {
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, [requestWakeLock]);

  const stopAutoScroll = useCallback(() => {
    setIsAutoScrolling(false);
    setIsContinuousMode(false);
    setIsExitDialogOpen(false);
    setTimeout(() => { 
      if (api) api.scrollTo(currentPartIndex, false); 
      containerRef.current?.focus();
    }, 100);
  }, [api, currentPartIndex]);

  const contentToDisplay = useMemo(() => {
    return song?.content ? transposeContent(song.content, transpose) : '';
  }, [song, transpose]);

  const songParts = useMemo(() => {
    if (!contentToDisplay) return [];
    return contentToDisplay.split(/\n\s*\n\s*\n/).filter(p => p.trim());
  }, [contentToDisplay]);

  useEffect(() => {
    if (!isContinuousMode || !isClient) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = parseInt(entry.target.getAttribute('data-part-index') || '0', 10);
          setCurrentPartIndex(idx);
        }
      });
    }, { 
      root: scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]'), 
      threshold: 0, 
      rootMargin: '-10% 0px -85% 0px' 
    });
    
    document.querySelectorAll('[data-part-index]').forEach(p => observer.observe(p));
    return () => observer.disconnect();
  }, [isContinuousMode, isClient, songParts]);

  useEffect(() => {
    if (!api || isContinuousMode) return;
    const onSelect = () => setCurrentPartIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); }
  }, [api, isContinuousMode]);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const { nextSong, prevSong, nextPage, prevPage, pedalType } = pedalSettings;

    if (pedalType === '4-buttons' && e.key === nextSong) {
      e.preventDefault();
      if (isExitDialogOpen) {
        stopAutoScroll();
      } else if (!isContinuousMode) {
        setIsContinuousMode(true);
        setIsAutoScrolling(true);
      } else {
        setIsExitDialogOpen(true);
      }
      return;
    }

    if (isContinuousMode) {
        const isPauseAction = e.key === prevSong || (pedalType === '2-buttons' && e.key === nextPage);
        if (isPauseAction) {
            e.preventDefault();
            setIsAutoScrolling(!isAutoScrolling);
            return;
        }
    } else {
        if (e.key === nextPage || e.key === "ArrowRight") {
            e.preventDefault();
            api?.scrollNext();
        } else if (e.key === prevPage || e.key === "ArrowLeft") {
            e.preventDefault();
            api?.scrollPrev();
        }
    }
  }, [api, pedalSettings, isAutoScrolling, isContinuousMode, stopAutoScroll, isExitDialogOpen]);

  const handleExportPDF = async () => {
    if (!song) return;
    setIsExporting(true);
    try {
      const lines = contentToDisplay.split('\n');
      const pageSize = 38;
      const pages: string[][] = [];
      
      let currentIdx = 0;
      while (currentIdx < lines.length) {
        let pageLines = lines.slice(currentIdx, currentIdx + pageSize);
        const isLastLineOfSong = (currentIdx + pageLines.length) >= lines.length;
        
        // Se a última linha da página for uma cifra E não for a última linha da música, move para a próxima página
        if (!isLastLineOfSong && pageLines.length === pageSize && isChordLine(pageLines[pageSize - 1])) {
            pageLines = lines.slice(currentIdx, currentIdx + pageSize - 1);
            currentIdx += (pageSize - 1);
        } else {
            currentIdx += pageSize;
        }

        while (pageLines.length < pageSize) {
          pageLines.push(' ');
        }
        pages.push(pageLines);
      }

      const longestLineCount = Math.max(...lines.map(l => l.length));
      const ptWidth = Math.max(400, longestLineCount * 7.5 + 100);
      const ptHeight = pageSize * 12 * 1.5 + 150;

      const pdf = new jsPDF('p', 'pt', [ptWidth, ptHeight]);

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.backgroundColor = '#fff';
      container.style.color = '#000';
      container.style.fontFamily = 'monospace';
      container.style.fontSize = '12pt';
      container.style.lineHeight = '1.4';
      container.style.padding = '40pt';
      container.style.width = `${ptWidth}pt`;
      document.body.appendChild(container);

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage([ptWidth, ptHeight]);
        
        const headerHtml = i === 0 ? `
          <div style="margin-bottom: 20pt; border-bottom: 1px solid #eee; padding-bottom: 10pt;">
            <h1 style="font-size: 24pt; margin: 0; color: #000;">${song.title}</h1>
            <p style="font-size: 14pt; margin: 5pt 0 0 0; color: #666;">${song.artist}</p>
          </div>
        ` : '';

        container.innerHTML = `
          ${headerHtml}
          <div style="white-space: pre-wrap; font-family: monospace; font-size: 12pt; color: #000;">
            ${pages[i].join('\n')}
          </div>
          <div style="margin-top: 20pt; text-align: right; font-size: 8pt; color: #aaa;">
            Página ${i + 1} de ${pages.length} • CifrasKadosh
          </div>
        `;

        await new Promise(r => setTimeout(r, 150));
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, ptWidth, ptHeight);
      }

      pdf.save(`${song.title}.pdf`);
      document.body.removeChild(container);
      toast({ title: "PDF Gerado", description: "O arquivo sob medida foi baixado com sucesso." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erro ao gerar PDF", description: "Ocorreu um problema ao exportar." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleStartScrolling = () => {
    setIsContinuousMode(true);
    setIsAutoScrolling(true);
    setTimeout(() => containerRef.current?.focus(), 50);
  };

  const handleToggleScrolling = () => {
    setIsAutoScrolling(!isAutoScrolling);
    setTimeout(() => containerRef.current?.focus(), 50);
  };

  if (!isClient || authLoading || loadingSong || !song) return <div className="flex-1 flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col p-4 md:p-8 h-screen outline-none overflow-hidden relative" 
      onKeyDownCapture={handleKeyDown} 
      tabIndex={0}
    >
      <Card className="mb-4 bg-accent/5">
        <CardContent className={cn("transition-all", isPanelVisible ? "p-4 space-y-4" : "p-1.5")}>
          {isPanelVisible ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <Button asChild variant="outline" size="icon"><Link href={fromSetlistId ? `/setlists/${fromSetlistId}` : '/songs'}><ArrowLeft className="h-4 w-4" /></Link></Button>
                <div className="text-center flex-1">
                  <h1 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{song.title}</h1>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Sun className={cn("h-3 w-3 transition-opacity", isWakeLockActive ? "text-orange-500 opacity-100" : "text-muted-foreground opacity-30")} />
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">{isWakeLockActive ? 'Tela Ativa' : 'Tela Normal'}</span>
                  </div>
                </div>
                <Button onClick={() => setIsPanelVisible(false)} variant="ghost" size="icon"><PanelTopClose className="h-5 w-5" /></Button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                  <div className="flex items-center gap-1 border rounded-md p-1 bg-background h-10 w-48">
                      <Button variant="ghost" size="icon" onClick={() => setTranspose(t => Math.max(-12, t - 1))} className="h-8 w-8"><Minus className="h-4 w-4" /></Button>
                      <Badge variant="secondary" className="flex-1 text-center justify-center">Tom: {transpose > 0 ? '+' : ''}{transpose}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => setTranspose(t => Math.min(12, t + 1))} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-between border rounded-md p-1 px-3 bg-background h-10 w-52">
                      <div className="flex items-center gap-2">
                          <Label className="text-xs">Cifras</Label>
                          <Switch checked={showChords} onCheckedChange={setShowChords} />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 border" onClick={handleExportPDF} disabled={isExporting}>
                          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                      </Button>
                  </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between h-8">
              <Button asChild variant="outline" size="icon" className="h-8 w-8"><Link href={fromSetlistId ? `/setlists/${fromSetlistId}` : '/songs'}><ArrowLeft className="h-4 w-4" /></Link></Button>
              <h1 className="text-sm font-bold truncate flex-1 text-center">{song.title}</h1>
              <Button onClick={() => setIsPanelVisible(true)} variant="ghost" size="icon" className="h-8 w-8"><PanelTopOpen className="h-5 w-5" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {!isContinuousMode && showChords && (
          <div className="absolute inset-0 z-10 flex pointer-events-none">
            <div className="w-1/4 h-full cursor-pointer pointer-events-auto" onClick={() => api?.scrollPrev()} title="Página Anterior" />
            <div className="flex-1 h-full" />
            <div className="w-1/4 h-full cursor-pointer pointer-events-auto" onClick={() => api?.scrollNext()} title="Próxima Página" />
          </div>
        )}

        {isContinuousMode || !showChords ? (
          <ScrollArea ref={scrollAreaRef} className="h-full bg-white dark:bg-black rounded-lg border">
            <div className="p-4 md:p-8 pb-32">
              {songParts.map((part, idx) => (
                <div key={idx} data-part-index={idx}>
                  <SongDisplay content={part} showChords={showChords} style={{ fontSize: `${finalFontSize}px` }} />
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Carousel className="w-full h-full" setApi={setApi}>
            <CarouselContent className="h-full">
              {songParts.map((part, index) => (
                <CarouselItem key={index} className="h-full">
                  <ScrollArea className="h-full p-4 md:p-8 bg-white dark:bg-black rounded-lg border">
                    <SongDisplay content={part} showChords={showChords} style={{ fontSize: `${finalFontSize}px` }} />
                  </ScrollArea>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t z-50">
          <div className="max-w-xl mx-auto flex items-center gap-4 p-2 rounded-lg border bg-muted/20">
              {!isContinuousMode && showChords ? (
                  <Button onClick={handleStartScrolling} className="h-9 gap-2 px-8 w-36"><Play className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wider">Iniciar</span></Button>
              ) : (
                  <div className="flex gap-2">
                      <Button variant={isAutoScrolling ? "destructive" : "default"} onClick={handleToggleScrolling} className="h-9 w-36">{isAutoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                      {showChords && (
                        <Button variant="outline" onClick={() => { setIsExitDialogOpen(true); setTimeout(() => containerRef.current?.focus(), 50); }} className="h-9 w-12"><X className="h-4 w-4" /></Button>
                      )}
                  </div>
              )}
              {(isContinuousMode || !showChords) && (
                  <div className="flex-1 flex items-center gap-3">
                      <Slider id="speed-slider" value={[scrollSpeed]} onValueChange={(v) => setScrollSpeed(v[0])} max={100} min={1} className="flex-1" />
                      <span className="text-[10px] font-mono font-bold w-10 text-primary">{scrollSpeed}</span>
                  </div>
              )}
          </div>
      </div>

      <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Sair do Modo Rolagem?</AlertDialogTitle>
                  <AlertDialogDescription>Deseja voltar ao modo de slides exatamente nesta posição?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => { setIsExitDialogOpen(false); containerRef.current?.focus(); }}>Não</AlertDialogCancel>
                  <AlertDialogAction onClick={stopAutoScroll}>Sim, Confirmar</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
