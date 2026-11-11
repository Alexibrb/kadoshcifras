'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Minus,
  Music,
  Plus,
} from 'lucide-react';

import {
  Button,
} from '@/components/ui/button';

import {
  Badge,
} from '@/components/ui/badge';

import {
  Card,
  CardContent,
} from '@/components/ui/card';

import {
  Label,
} from '@/components/ui/label';

import {
  Switch,
} from '@/components/ui/switch';

import {
  SongDisplay,
} from '@/components/song-display';

import {
  paginateContent,
  transposeChord,
  transposeContent,
} from '@/lib/music';

import {
  useLocalStorage,
} from '@/hooks/use-local-storage';

import type {
  PedalSettings,
  Song,
} from '@/types';


export default function OfflineSongPage() {

  const [
    song,
    setSong,
  ] =
    useState<Song | null>(
      null
    );


  const [
    songId,
    setSongId,
  ] =
    useState('');


  const [
    fromSetlistId,
    setFromSetlistId,
  ] =
    useState<string | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );


  const [
    transpose,
    setTranspose,
  ] =
    useState(0);


  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(0);


  /*
  ==================================================
  CONFIGURAÇÕES LOCAIS
  ==================================================
  */

  const [
    showChords,
    setShowChords,
  ] =
    useLocalStorage(
      'song-show-chords',
      true
    );


  const [
    fontSize,
  ] =
    useLocalStorage(
      'song-font-size',
      14
    );


  const [
    linesPerPage,
  ] =
    useLocalStorage(
      'song-lines-per-page',
      14
    );


  const [
    pedalSettings,
  ] =
    useLocalStorage<PedalSettings>(
      'pedal-settings',
      {

        pedalType:
          '4-buttons',

        prevPage:
          ',',

        nextPage:
          '.',

        prevSong:
          '[',

        nextSong:
          ']',

      }
    );


  /*
  ==================================================
  LER ID DA URL
  ==================================================
  */

  useEffect(() => {

    const params =
      new URLSearchParams(
        window.location.search
      );


    const id =
      params.get('id');


    const transposeParam =
      params.get(
        'transpose'
      );


    const fromSetlist =
      params.get(
        'fromSetlist'
      );


    if (!id) {

      setError(
        'Música não informada.'
      );

      setLoading(false);

      return;

    }


    setSongId(id);


    setFromSetlistId(
      fromSetlist
    );


    if (
      transposeParam !== null
    ) {

      const parsed =
        Number(
          transposeParam
        );


      if (
        Number.isFinite(
          parsed
        )
      ) {

        setTranspose(
          parsed
        );

      }

    }


    /*
    ==================================================
    CARREGAR MÚSICA LOCAL
    ==================================================
    */

    try {

      const stored =
        localStorage.getItem(
          `offline-song-${id}`
        );


      if (!stored) {

        setError(
          'Esta música ainda não está disponível offline.'
        );

        setLoading(false);

        return;

      }


      const parsedSong =
        JSON.parse(
          stored
        ) as Song;


      setSong(
        parsedSong
      );


      setLoading(false);


    } catch (error) {

      console.error(
        '[Offline] Erro carregando música:',
        error
      );


      setError(
        'Erro ao carregar a música.'
      );


      setLoading(false);

    }

  }, []);


  /*
  ==================================================
  CONTEÚDO TRANSPOSITO
  ==================================================
  */

  const content =
    useMemo(() => {

      if (!song) {

        return '';

      }


      return transposeContent(
        song.content,
        transpose
      );

    }, [
      song,
      transpose,
    ]);


  /*
  ==================================================
  PÁGINAS
  ==================================================
  */

  const pages =
    useMemo(() => {

      if (!content) {

        return [];

      }


      return paginateContent(
        content,
        linesPerPage
      );

    }, [
      content,
      linesPerPage,
    ]);


  /*
  ==================================================
  TOM ATUAL
  ==================================================
  */

  const currentKey =
    useMemo(() => {

      if (
        !song?.key
      ) {

        return null;

      }


      return transposeChord(
        song.key,
        transpose
      );

    }, [
      song?.key,
      transpose,
    ]);


  /*
  ==================================================
  MUDAR TOM
  ==================================================
  */

  const changeTranspose =
    (
      amount: number
    ) => {

      setTranspose(
        current =>
          Math.max(
            -12,
            Math.min(
              12,
              current + amount
            )
          )
      );


      setCurrentPage(0);

    };


  /*
  ==================================================
  PÁGINA ANTERIOR
  ==================================================
  */

  const previousPage =
    useCallback(() => {

      setCurrentPage(
        current =>
          Math.max(
            0,
            current - 1
          )
      );

    }, []);


  /*
  ==================================================
  PRÓXIMA PÁGINA
  ==================================================
  */

  const nextPage =
    useCallback(() => {

      setCurrentPage(
        current =>
          Math.min(
            Math.max(
              0,
              pages.length - 1
            ),
            current + 1
          )
      );

    }, [
      pages.length,
    ]);


  /*
  ==================================================
  PEDAL / TECLADO
  ==================================================
  */

  useEffect(() => {

    const handler =
      (
        event: KeyboardEvent
      ) => {

        if (
          event.key ===
            pedalSettings.nextPage ||
          event.key ===
            'ArrowRight'
        ) {

          event.preventDefault();

          nextPage();

        }


        if (
          event.key ===
            pedalSettings.prevPage ||
          event.key ===
            'ArrowLeft'
        ) {

          event.preventDefault();

          previousPage();

        }

      };


    window.addEventListener(
      'keydown',
      handler
    );


    return () => {

      window.removeEventListener(
        'keydown',
        handler
      );

    };


  }, [
    pedalSettings,
    nextPage,
    previousPage,
  ]);


  /*
  ==================================================
  VOLTAR
  ==================================================
  */

  const goBack = () => {

    if (
      fromSetlistId
    ) {

      window.location.assign(

        `/offline-setlist?id=${encodeURIComponent(
          fromSetlistId
        )}`

      );


      return;

    }


    window.location.assign(
      '/songs'
    );

  };


  /*
  ==================================================
  CARREGANDO
  ==================================================
  */

  if (loading) {

    return (

      <div
        className="flex min-h-screen items-center justify-center"
      >

        Carregando...

      </div>

    );

  }


  /*
  ==================================================
  ERRO
  ==================================================
  */

  if (
    error ||
    !song
  ) {

    return (

      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
      >

        <Music
          className="h-10 w-10 text-muted-foreground"
        />


        <p>

          {error}

        </p>


        <Button
          type="button"
          onClick={
            () =>
              window.location.assign(
                '/songs'
              )
          }
        >

          Voltar para músicas

        </Button>

      </div>

    );

  }


  /*
  ==================================================
  TELA
  ==================================================
  */

  return (

    <div
      className="flex min-h-screen flex-col bg-background p-3 md:p-6"
    >

      <Card
        className="mb-3"
      >

        <CardContent
          className="p-3"
        >

          <div
            className="flex items-center gap-3"
          >

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={goBack}
            >

              <ArrowLeft
                className="h-4 w-4"
              />

            </Button>


            <div
              className="min-w-0 flex-1 text-center"
            >

              <h1
                className="truncate text-lg font-bold"
              >

                {song.title}

              </h1>


              <p
                className="truncate text-sm text-muted-foreground"
              >

                {song.artist}

              </p>

            </div>


            <Badge
              variant="secondary"
            >

              Offline

            </Badge>

          </div>


          <div
            className="mt-3 flex flex-wrap items-center justify-center gap-2"
          >

            <div
              className="flex items-center rounded-md border"
            >

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={
                  () =>
                    changeTranspose(
                      -1
                    )
                }
              >

                <Minus
                  className="h-4 w-4"
                />

              </Button>


              <Badge
                variant="outline"
                className="min-w-20 justify-center"
              >

                Tom: {
                  currentKey ||
                  'N/A'
                }

              </Badge>


              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={
                  () =>
                    changeTranspose(
                      1
                    )
                }
              >

                <Plus
                  className="h-4 w-4"
                />

              </Button>

            </div>


            <div
              className="flex items-center gap-2 rounded-md border px-3 py-2"
            >

              <Label>

                Cifras

              </Label>


              <Switch
                checked={
                  showChords
                }
                onCheckedChange={
                  setShowChords
                }
              />

            </div>

          </div>

        </CardContent>

      </Card>


      <Card
        className="flex-1"
      >

        <CardContent
          className="p-4 md:p-8"
        >

          <SongDisplay

            content={
              pages[currentPage] ||
              ''
            }

            showChords={
              showChords
            }

            style={{
              fontSize:
                `${fontSize}px`,
            }}

          />

        </CardContent>

      </Card>


      <div
        className="mt-3 flex items-center justify-between gap-3"
      >

        <Button
          type="button"
          variant="outline"
          disabled={
            currentPage <= 0
          }
          onClick={
            previousPage
          }
        >

          <ChevronLeft
            className="mr-1 h-4 w-4"
          />

          Anterior

        </Button>


        <Badge
          variant="secondary"
        >

          Página {
            currentPage + 1
          } / {
            Math.max(
              1,
              pages.length
            )
          }

        </Badge>


        <Button
          type="button"
          variant="outline"
          disabled={
            currentPage >=
            pages.length - 1
          }
          onClick={
            nextPage
          }
        >

          Próxima

          <ChevronRight
            className="ml-1 h-4 w-4"
          />

        </Button>

      </div>

    </div>

  );

}