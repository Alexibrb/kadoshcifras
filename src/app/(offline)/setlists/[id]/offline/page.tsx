
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, PanelTopClose, PanelTopOpen, Music, File, Sun, Moon, FileDown, Loader2 } from 'lucide-react';
import { SongDisplay } from '@/components/song-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { PedalSettings, ColorSettings } from '@/types';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { transposeChord, transposeContent, isChordLine } from '@/lib/music';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface OfflineSong {
    title: string;
    artist: string;
    content: string;
    key?: string;
    initialTranspose: number;
}

interface OfflineSetlist {
    name: string;
    songs: OfflineSong[];
}

interface Section {
    songIndex: number;
    partIndex: number;
    content: string;
    isLastSectionOfSong: boolean;
    isLastSectionOfSetlist: boolean;
}

function SongPresenter({ 
    section, 
    transposeValue, 
    fontSize, 
    showChords, 
    colorSettings,
    id
} : { 
    section: Section | undefined, 
    transposeValue: number, 
    fontSize: number, 
    showChords: boolean, 
    colorSettings: ColorSettings | null,
    id?: string
}) {
    if (!section) return null;

    const content = transposeContent(section.content, transposeValue);

    return (
        <Card id={id} className="w-full h-full flex flex-col bg-white dark:bg-black shadow-none border-none">
            <CardContent className="flex-1 h-full p-0">
                <ScrollArea className="h-full p-4 md:p-6 pt-0">
                    <SongDisplay 
                        style={{ 
                            fontSize: `${fontSize}px`,
                            '--lyrics-color': colorSettings?.lyricsColor,
                            '--chords-color': colorSettings?.chordsColor,
                        } as React.CSSProperties} 
                        content={content} 
                        showChords={showChords} 
                    />
                    {section.isLastSectionOfSong && !section.isLastSectionOfSetlist && (
                        <div className="mt-8 text-center text-muted-foreground">
                            <Separator className="my-4" />
                            <div className="flex items-center justify-center gap-2 text-sm">
                                <Music className="h-4 w-4" />
                                <span>Fim da Música</span>
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

export default function OfflineSetlistPage() {
  const params = useParams();
  const setlistId = params.id as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const { toast } = useToast();

  const [offlineData, setOfflineData] = useState<OfflineSetlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [fontSize] = useLocalStorage('song-font-size', 14);
  const [showChords, setShowChords] = useLocalStorage('song-show-chords', true);
  const [isPanelVisible, setIsPanelVisible] = useLocalStorage('song-panel-visible', true);
  const [keepAwake, setKeepAwake] = useState(true);
  const [isWakeLockSupported, setIsWakeLockSupported] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  const [pedalSettings] = useLocalStorage<PedalSettings>('pedal-settings', {
    prevPage: ',',
    nextPage: '.',
    prevSong: '[',
    nextSong: ']',
  });
  
  const [api, setApi] = useState<CarouselApi>()
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [transpositions, setTranspositions] = useState<number[]>([]);
  const [isClient, setIsClient] = useState(false);

  const [finalColorSettings, setFinalColorSettings] = useState<ColorSettings | null>(null);

  const requestWakeLock = useCallback(async (isUserInteraction = false) => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator && keepAwake) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setIsWakeLockActive(true);
      } catch (err: any) {
        setIsWakeLockActive(false);
        if (isUserInteraction && err.name !== 'NotAllowedError') {
            console.warn(`Wake Lock: ${err.name}, ${err.message}`);
        }
      }
    }
  }, [keepAwake]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsWakeLockActive(false);
      } catch (err) {
        console.warn('Error releasing wake lock:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsWakeLockSupported('wakeLock' in navigator);
    }
  }, []);

  useEffect(() => {
    if (keepAwake) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    
    return () => {
      releaseWakeLock();
    };
  }, [keepAwake, requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [requestWakeLock]);

  useEffect(() => {
    setIsClient(true);
    if (containerRef.current) {
        containerRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      const defaultSettings: ColorSettings = {
          lyricsColor: isDarkMode ? '#FFFFFF' : '#000000',
          chordsColor: isDarkMode ? '#F59E0B' : '#000000',
      };
      
      const storedSettings = localStorage.getItem('user-color-settings');
      if (storedSettings) {
           try {
             setFinalColorSettings(JSON.parse(storedSettings));
           } catch(e) {
             setFinalColorSettings(defaultSettings);
           }
      } else {
          setFinalColorSettings(defaultSettings);
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLoading(true);
      try {
        const storageKey = `offline-setlist-${setlistId}`;
        const item = localStorage.getItem(storageKey);
        if (item) {
          const parsedData = JSON.parse(item) as OfflineSetlist;
          if (parsedData && typeof parsedData.name === 'string' && Array.isArray(parsedData.songs)) {
              setOfflineData(parsedData);
              setTranspositions(parsedData.songs.map(s => s.initialTranspose || 0));
              setError(null);
          } else {
              setError("Dados offline corrompidos ou em formato inválido. Por favor, gere o repertório novamente.");
          }
        } else {
          setError("Dados offline não encontrados. Por favor, volte e clique em 'Abrir Repertório' na página do repertório.");
        }
      } catch (e) {
        console.error("Erro ao ler do localStorage:", e);
        setError("Não foi possível carregar os dados offline. O formato pode ser inválido. Tente gerar novamente.");
      } finally {
        setLoading(false);
      }
    }
  }, [setlistId]);
  
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const allSections = useMemo((): Section[] => {
    if (!offlineData) return [];
    
    const sections: Section[] = [];
    offlineData.songs.forEach((song, songIndex) => {
        const parts = song.content.split(/\n\s*\n\s*\n/);
        parts.forEach((part, partIndex) => {
            sections.push({
                songIndex: songIndex,
                partIndex: partIndex,
                content: part,
                isLastSectionOfSong: partIndex === parts.length - 1,
                isLastSectionOfSetlist: partIndex === parts.length - 1 && songIndex === offlineData.songs.length - 1,
            });
        });
    });
    return sections;
  }, [offlineData]);

   useEffect(() => {
    if (!api) return;
    const handleSelect = () => setCurrentSectionIndex(api.selectedScrollSnap());
    api.on("select", handleSelect);
    handleSelect();
    return () => { api.off("select", handleSelect); }
  }, [api]);

  const currentSection = allSections[currentSectionIndex];
  const currentSongIndex = currentSection?.songIndex;
  const currentSong = typeof currentSongIndex === 'number' ? offlineData?.songs[currentSongIndex] : undefined;
  const currentSongTranspose = typeof currentSongIndex === 'number' ? (transpositions[currentSongIndex] ?? 0) : 0;
  
  const fullContentWithoutChords = useMemo(() => {
    if (!offlineData) return '';
    return offlineData.songs
        .map(song => transposeContent(song.content, transpositions[offlineData.songs.indexOf(song)] ?? 0))
        .join('\n\n---\n\n')
        .replace(/\n\s*\n\s*\n/g, '\n\n');
  }, [offlineData, transpositions]);


  const totalPagesOfSong = useMemo(() => {
    if (typeof currentSongIndex !== 'number') return 0;
    return allSections.filter(s => s.songIndex === currentSongIndex).length;
  }, [allSections, currentSongIndex]);

  const currentPageOfSong = currentSection ? currentSection.partIndex + 1 : 0;

  const goToSong = useCallback((direction: 'next' | 'prev') => {
      if (typeof currentSongIndex !== 'number') return;
      
      const nextSongIndex = direction === 'next' ? currentSongIndex + 1 : currentSongIndex - 1;
      
      if (nextSongIndex < 0 || nextSongIndex >= (offlineData?.songs.length ?? 0)) return;

      const targetSectionIndex = allSections.findIndex(s => s.songIndex === nextSongIndex);
      if (targetSectionIndex !== -1) {
          api?.scrollTo(targetSectionIndex);
      }
  }, [currentSongIndex, offlineData?.songs.length, allSections, api]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        const key = event.key;
        if (showChords) {
            if (key === "ArrowLeft" || key === 'PageUp' || key === pedalSettings.prevPage) {
            event.preventDefault();
            api?.scrollPrev();
            } else if (key === "ArrowRight" || key === 'PageDown' || key === pedalSettings.nextPage) {
            event.preventDefault();
            api?.scrollNext();
            }
            else if (key === pedalSettings.prevSong) {
            event.preventDefault();
            goToSong('prev');
            } else if (key === pedalSettings.nextSong) {
            event.preventDefault();
            goToSong('next');
            }
        }
  }, [api, pedalSettings, goToSong, showChords]);
  
  const changeTranspose = (change: number) => {
    if (typeof currentSongIndex !== 'number') return;
    setTranspositions(prev => {
        const newTranspositions = [...prev];
        const currentTranspose = newTranspositions[currentSongIndex];
        const newTransposeValue = Math.min(12, Math.max(-12, currentTranspose + change));
        newTranspositions[currentSongIndex] = newTransposeValue;
        return newTranspositions;
    });
  };

  const handleExportPDF = async () => {
    if (!offlineData) return;
    setIsGeneratingPDF(true);
    
    try {
        const { jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.width = 'fit-content';
        document.body.appendChild(tempContainer);

        let pagesToProcess: any[] = [];
        
        // Estratégia unificada:ignora slides manuais e pagina a cada 40 linhas
        offlineData.songs.forEach((song, songIndex) => {
            const transpose = transpositions[songIndex] ?? 0;
            const fullContent = transposeContent(song.content, transpose)
                                .replace(/\n\s*\n\s*\n/g, '\n\n'); // Ignora slides extras

            const lines = fullContent.split('\n');
            // Filtra se for modo sem cifra
            const filteredLines = showChords ? lines : lines.filter(line => !isChordLine(line));
            
            const linesPerPage = 40;
            for (let i = 0; i < filteredLines.length; i += linesPerPage) {
                const chunk = filteredLines.slice(i, i + linesPerPage).join('\n');
                pagesToProcess.push({
                    songIndex,
                    content: chunk,
                    partIndex: Math.floor(i / linesPerPage),
                    totalParts: Math.ceil(filteredLines.length / linesPerPage)
                });
            }
        });

        const totalPdfPages = pagesToProcess.length;
        let doc: any;

        for (let i = 0; i < totalPdfPages; i++) {
            const pageInfo = pagesToProcess[i];
            const song = offlineData.songs[pageInfo.songIndex];
            const transpose = transpositions[pageInfo.songIndex] ?? 0;

            const pageDiv = document.createElement('div');
            pageDiv.style.padding = '20mm';
            pageDiv.style.paddingBottom = '35mm';
            pageDiv.style.boxSizing = 'border-box';
            pageDiv.style.backgroundColor = 'white';
            pageDiv.style.color = 'black';
            pageDiv.style.position = 'relative';
            pageDiv.style.width = 'fit-content';
            pageDiv.style.minWidth = '160mm';
            pageDiv.style.display = 'inline-block';

            const header = document.createElement('div');
            header.style.marginBottom = '10mm';
            header.style.borderBottom = '2px solid #f0f0f0';
            header.style.paddingBottom = '5mm';
            header.style.width = '100%';
            header.innerHTML = `
                <div style="font-family: serif; font-size: 24pt; font-weight: bold; color: #9f50e5;">${song.title}</div>
                <div style="font-family: serif; font-size: 14pt; color: #666; margin-top: 5px;">${song.artist} ${song.key && showChords ? `<span style="margin-left: 15px; color: #9f50e5;">• Tom: ${transposeChord(song.key, transpose)}</span>` : ''}</div>
                <div style="font-size: 10pt; color: #999; margin-top: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Página ${pageInfo.partIndex + 1} de ${pageInfo.totalParts}</div>
            `;
            pageDiv.appendChild(header);

            const contentDiv = document.createElement('div');
            contentDiv.style.whiteSpace = 'pre';
            contentDiv.style.fontFamily = 'monospace';
            contentDiv.style.fontSize = `${fontSize * 1.3}px`;
            contentDiv.style.lineHeight = '1.4';
            
            const lines = pageInfo.content.split('\n');
            lines.forEach(line => {
                const isChord = isChordLine(line);
                const p = document.createElement('p');
                p.style.margin = '0';
                p.style.minHeight = '1.2em';
                p.textContent = line || ' ';
                
                if (isChord && showChords) {
                    p.style.fontWeight = 'bold';
                    p.style.color = finalColorSettings?.chordsColor || '#F59E0B';
                } else {
                    p.style.color = finalColorSettings?.lyricsColor || 'black';
                }
                
                contentDiv.appendChild(p);
            });
            pageDiv.appendChild(contentDiv);

            const footerDiv = document.createElement('div');
            footerDiv.style.position = 'absolute';
            footerDiv.style.bottom = '10mm';
            footerDiv.style.left = '0';
            footerDiv.style.right = '0';
            footerDiv.style.fontSize = '12pt';
            footerDiv.style.color = '#9f50e5';
            footerDiv.style.borderTop = '2px solid #f0f0f0';
            footerDiv.style.paddingTop = '8mm';
            footerDiv.style.margin = '0 20mm';
            footerDiv.style.display = 'flex';
            footerDiv.style.justifyContent = 'center';
            footerDiv.style.alignItems = 'center';
            footerDiv.style.textAlign = 'center';
            
            footerDiv.innerHTML = `
                <div style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 30px; font-weight: bold;">
                    <span style="flex: 1; text-align: right; color: #9f50e5; opacity: ${i > 0 ? '1' : '0.2'}">${i > 0 ? '← ANTERIOR' : ''}</span>
                    <span style="color: #666; background: #f8f8f8; padding: 5px 15px; border-radius: 20px; min-width: 50mm;">PAGINA ${i + 1} / ${totalPdfPages}</span>
                    <span style="flex: 1; text-align: left; color: #9f50e5; opacity: ${i < totalPdfPages - 1 ? '1' : '0.2'}">${i < totalPdfPages - 1 ? 'PRÓXIMA →' : ''}</span>
                </div>
            `;
            pageDiv.appendChild(footerDiv);

            tempContainer.innerHTML = '';
            tempContainer.appendChild(pageDiv);

            const rect = pageDiv.getBoundingClientRect();
            const widthMM = rect.width * 0.264583;
            const heightMM = rect.height * 0.264583;

            const canvas = await html2canvas(pageDiv, {
                scale: 2,
                useCORS: true,
                backgroundColor: 'white',
                width: rect.width,
                height: rect.height
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            if (i === 0) {
                doc = new jsPDF({
                    orientation: widthMM > heightMM ? 'l' : 'p',
                    unit: 'mm',
                    format: [widthMM, heightMM]
                });
            } else {
                doc.addPage([widthMM, heightMM], widthMM > heightMM ? 'l' : 'p');
            }

            doc.addImage(imgData, 'JPEG', 0, 0, widthMM, heightMM);

            const linkY = heightMM - 20;
            const linkWidth = widthMM / 3;
            
            if (i > 0) {
              doc.link(20, linkY, linkWidth, 15, { pageNumber: i });
            }
            if (i < totalPdfPages - 1) {
              doc.link(widthMM - linkWidth - 20, linkY, linkWidth, 15, { pageNumber: i + 2 });
            }
        }

        doc.save(`${offlineData.name}${!showChords ? '_Letras' : '_Cifrado'}_Interativo.pdf`);
        document.body.removeChild(tempContainer);
        
        toast({
            title: "PDF Gerado!",
            description: "O arquivo foi adaptado ao conteúdo e baixado."
        });
    } catch (e) {
        console.error("Erro ao gerar PDF:", e);
        toast({
            title: "Erro ao gerar PDF",
            description: "Não foi possível criar o arquivo.",
            variant: "destructive"
        });
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  if (loading || !isClient || !finalColorSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
        <h2 className="text-2xl font-bold mb-4 text-primary">Carregando Modo Offline...</h2>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
        <h2 className="text-2xl font-bold text-destructive mb-4">Erro ao Carregar</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button asChild>
          <Link href={`/setlists/${setlistId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Repertório
          </Link>
        </Button>
      </div>
    );
  }
  
  if (!offlineData || !currentSong) {
     return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
        <h2 className="text-2xl font-bold mb-4">Dados Offline Não Encontrados</h2>
        <p className="text-muted-foreground">Gere os dados na página do repertório antes de acessar.</p>
         <Button asChild className="mt-6">
          <Link href={`/setlists/${setlistId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Repertório
          </Link>
        </Button>
      </div>
    );
  }

  const displayedKey = currentSong.key ? transposeChord(currentSong.key, currentSongTranspose) : 'N/A';

  return (
    <div ref={containerRef} className="flex-1 flex flex-col p-4 md:p-8 pt-6 pb-8 h-screen outline-none bg-background" onKeyDownCapture={handleKeyDown} tabIndex={-1}>
      <Card className="mb-4 bg-accent/10 transition-all duration-300">
            <CardContent className="p-4 space-y-4">
              {isPanelVisible ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <Button asChild variant="outline" size="icon" className="shrink-0">
                      <Link href={`/setlists/${setlistId}`}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Voltar</span>
                      </Link>
                    </Button>

                    <div className="flex-1 space-y-1">
                      <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight truncate">{showChords ? currentSong.title : offlineData.name}</h1>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Modo Offline</Badge>
                        {isWakeLockActive ? <Sun className="h-3 w-3 text-yellow-500" /> : <Moon className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>
                    
                    <Button onClick={() => setIsPanelVisible(false)} variant="ghost" size="icon" className="shrink-0">
                      <PanelTopClose className="h-5 w-5" />
                      <span className="sr-only">Ocultar Controles</span>
                    </Button>
                  </div>
                
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-row items-center gap-2 w-full">
                       <div className="flex items-center gap-1 rounded-md border p-1 flex-1 bg-background overflow-hidden h-10">
                            <Button variant="ghost" size="icon" onClick={() => changeTranspose(-1)} className="h-8 w-8 shrink-0">
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Badge variant="secondary" className="px-2 py-1 text-[10px] md:text-xs whitespace-nowrap flex-grow text-center justify-center">
                                Tom: {displayedKey} ({currentSongTranspose > 0 ? '+' : ''}{currentSongTranspose})
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => changeTranspose(1)} className="h-8 w-8 shrink-0">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex items-center space-x-2 rounded-md border p-1 px-3 bg-background h-10 flex-1">
                            <Label htmlFor="show-chords" className="text-[10px] md:text-xs font-semibold whitespace-nowrap">Cifras</Label>
                            <Switch id="show-chords" checked={showChords} onCheckedChange={setShowChords} />
                        </div>
                    </div>

                    <div className="flex flex-row items-center gap-2 w-full">
                        {isWakeLockSupported && (
                          <div className="flex items-center space-x-2 rounded-md border p-1 px-3 bg-background h-10 flex-1">
                              <Label htmlFor="keep-awake" className="text-[10px] md:text-xs font-semibold whitespace-nowrap">Tela Acesa</Label>
                              <Switch 
                                  id="keep-awake" 
                                  checked={keepAwake} 
                                  onCheckedChange={(val) => {
                                      setKeepAwake(val);
                                      if (val) requestWakeLock(true);
                                  }} 
                              />
                          </div>
                        )}

                        <Button onClick={handleExportPDF} variant="outline" className="h-10 flex-1 text-[10px] md:text-xs font-semibold" disabled={isGeneratingPDF}>
                          {isGeneratingPDF ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                              <FileDown className="mr-2 h-4 w-4" />
                          )}
                          <span>PDF</span>
                        </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <Button asChild variant="outline" size="icon" className="shrink-0">
                    <Link href={`/setlists/${setlistId}`}>
                      <ArrowLeft className="h-4 w-4" />
                      <span className="sr-only">Voltar</span>
                    </Link>
                  </Button>
                  <div className="flex flex-col items-center overflow-hidden">
                    <h1 className="text-lg font-bold font-headline tracking-tight truncate w-full text-center">
                       {showChords ? currentSong.title : offlineData.name}
                    </h1>
                    {isWakeLockActive && <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold uppercase tracking-widest flex items-center gap-1"><Sun className="h-2 w-2" /> Tela Ativa</p>}
                  </div>
                  <Button onClick={() => setIsPanelVisible(true)} variant="ghost" size="icon" className="shrink-0">
                    <PanelTopOpen className="h-5 w-5" />
                    <span className="sr-only">Mostrar Controles</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
      <div className="flex-1 flex flex-col min-h-0">
        {showChords ? (
          <>
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="text-xs font-semibold flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 border text-foreground">
                  <Music className="h-3 w-3" />
                  Música {currentSongIndex + 1}/{offlineData?.songs.length ?? 0}
              </div>
              {totalPagesOfSong > 1 && (
                <div className="text-xs font-semibold flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 border text-foreground">
                    <File className="h-3 w-3" />
                    Página {currentPageOfSong}/{totalPagesOfSong}
                </div>
              )}
            </div>
            <Carousel className="w-full flex-1" setApi={setApi} opts={{ watchDrag: true, loop: false }}>
              <CarouselContent>
                {allSections.map((section, index) => (
                  <CarouselItem key={index} className="h-full">
                      <SongPresenter
                          section={section}
                          transposeValue={transpositions[section.songIndex] ?? 0}
                          fontSize={fontSize}
                          showChords={showChords}
                          colorSettings={finalColorSettings}
                      />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 hidden md:block">
                <CarouselPrevious />
              </div>
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 hidden md:block">
                <CarouselNext />
              </div>
              <div 
                  className="absolute left-0 top-0 h-full w-1/3 z-10" 
                  onClick={() => api?.scrollPrev()} 
              />
              <div 
                  className="absolute right-0 top-0 h-full w-1/3 z-10" 
                  onClick={() => api?.scrollNext()} 
              />
            </Carousel>
          </>
        ) : (
          <Card className="flex-1 flex flex-col bg-white dark:bg-black shadow-none border-none">
              <CardContent className="h-full flex flex-col p-0">
                  <ScrollArea className="h-full p-4 md:p-6 flex-1">
                      <SongDisplay 
                          style={{ 
                            fontSize: `${fontSize}px`,
                            '--lyrics-color': finalColorSettings.lyricsColor,
                           }}
                          content={fullContentWithoutChords}
                          showChords={false} 
                      />
                  </ScrollArea>
              </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
