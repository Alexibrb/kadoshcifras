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
} from '@/types';


interface OfflineSong {
  id: string;
  title: string;
  artist: string;
  content: string;
  key?: string;
  initialTranspose: number;
}


interface OfflineSetlist {
  id: string;
  name: string;
  songs: OfflineSong[];
}


interface Section {
  songIndex: number;
  pageIndex: number;
  content: string;
}


export default function OfflineSetlistPage() {

  const [
    data,
    setData,
  ] =
    useState<OfflineSetlist | null>(
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
    currentSection,
    setCurrentSection,
  ] =
    useState(0);


  const [
    transpositions,
    setTranspositions,
  ] =
    useState<number[]>(
      []
    );


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
  CARREGAR REPERTÓRIO
  ==================================================
  */

  useEffect(() => {

    const params =
      new URLSearchParams(
        window.location.search
      );


    const setlistId =
      params.get('id');


    if (!setlistId) {

      setError(
        'Repertório não informado.'
      );

      setLoading(false);

      return;

    }


    try {

      const stored =
        localStorage.getItem(
          `offline-setlist-${setlistId}`
        );


      if (!stored) {

        setError(
          'Este repertório ainda não está disponível offline.'
        );

        setLoading(false);

        return;

      }


      const parsed =
        JSON.parse(
          stored
        ) as OfflineSetlist;


      setData(
        parsed
      );


      setTranspositions(

        parsed.songs.map(
          song =>
            song.initialTranspose ||
            0
        )

      );


      setLoading(false);


    } catch (error) {

      console.error(
        '[Offline] Erro carregando repertório:',
        error
      );


      setError(
        'Erro ao carregar repertório.'
      );


      setLoading(false);

    }

  }, []);


  /*
  ==================================================
  GERAR TODAS AS PÁGINAS
  ==================================================
  */

  const sections =
    useMemo(() => {

      if (!data) {

        return [];
      }


      const result:
        Section[] = [];


      data.songs.forEach(
        (
          song,
          songIndex
        ) => {

          const transpose =
            transpositions[
              songIndex
            ] || 0;


          const content =
            transposeContent(
              song.content,
              transpose
            );


          const pages =
            paginateContent(
              content,
              linesPerPage
            );


          pages.forEach(
            (
              page,
              pageIndex
            ) => {

              result.push({

                songIndex,

                pageIndex,

                content:
                  page,

              });

            }
          );

        }
      );


      return result;

    }, [
      data,
      transpositions,
      linesPerPage,
    ]);


  const section =
    sections[
      currentSection
    ];


  const song =
    data &&
    section
      ? data.songs[
          section.songIndex
        ]
      : null;


  /*
  ==================================================
  TOM ATUAL
  ==================================================
  */

  const currentKey =
    useMemo(() => {

      if (
        !song?.key ||
        !section
      ) {

        return null;

      }


      return transposeChord(

        song.key,

        transpositions[
          section.songIndex
        ] || 0

      );

    }, [
      song,
      section,
      transpositions,
    ]);


  /*
  ==================================================
  ANTERIOR
  ==================================================
  */

  const previous =
    useCallback(() => {

      setCurrentSection(
        current =>
          Math.max(
            0,
            current - 1
          )
      );

    }, []);


  /*
  ==================================================
  PRÓXIMO
  ==================================================
  */

  const next =
    useCallback(() => {

      setCurrentSection(
        current =>
          Math.min(
            Math.max(
              0,
              sections.length - 1
            ),
            current + 1
          )
      );

    }, [
      sections.length,
    ]);


  /*
  ==================================================
  ALTERAR TOM DA MÚSICA ATUAL
  ==================================================
  */

  const changeTranspose =
    (
      amount: number
    ) => {

      if (!section) {

        return;

      }


      setTranspositions(
        current => {

          const nextValues =
            [...current];


          const index =
            section.songIndex;


          nextValues[index] =
            Math.max(
              -12,
              Math.min(
                12,
                (
                  nextValues[
                    index
                  ] || 0
                ) + amount
              )
            );


          return nextValues;

        }
      );


      /*
      ------------------------------------------
      Voltar à primeira página da música atual
      ------------------------------------------
      */

      const firstPageIndex =
        sections.findIndex(
          item =>
            item.songIndex ===
            section.songIndex
        );


      if (
        firstPageIndex >= 0
      ) {

        setCurrentSection(
          firstPageIndex
        );

      }

    };


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

          next();

        }


        if (
          event.key ===
            pedalSettings.prevPage ||
          event.key ===
            'ArrowLeft'
        ) {

          event.preventDefault();

          previous();

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
    next,
    previous,
  ]);


  if (loading) {

    return (

      <div
        className="flex min-h-screen items-center justify-center"
      >

        Carregando...

      </div>

    );

  }


  if (
    error ||
    !data ||
    !song ||
    !section
  ) {

    return (

      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
      >

        <Music
          className="h-10 w-10 text-muted-foreground"
        />


        <p>

          {
            error ||
            'Repertório não encontrado.'
          }

        </p>


        <Button
          type="button"
          onClick={
            () =>
              window.location.assign(
                '/setlists'
              )
          }
        >

          Voltar para repertórios

        </Button>

      </div>

    );

  }


  /*
  ==================================================
  CONTADORES
  ==================================================
  */

  const songNumber =
    section.songIndex + 1;


  const pagesOfCurrentSong =
    sections.filter(
      item =>
        item.songIndex ===
        section.songIndex
    );


  const pageNumber =
    pagesOfCurrentSong.findIndex(
      item =>
        item.pageIndex ===
        section.pageIndex
    ) + 1;


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

              onClick={
                () =>
                  window.location.assign(
                    '/setlists'
                  )
              }

            >

              <ArrowLeft
                className="h-4 w-4"
              />

            </Button>


            <div
              className="min-w-0 flex-1 text-center"
            >

              <p
                className="truncate text-xs text-muted-foreground"
              >

                {data.name}

              </p>


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

            <Badge
              variant="outline"
            >

              Música {
                songNumber
              } / {
                data.songs.length
              }

            </Badge>


            <Badge
              variant="outline"
            >

              Página {
                pageNumber
              } / {
                Math.max(
                  1,
                  pagesOfCurrentSong.length
                )
              }

            </Badge>


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
              section.content
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
            currentSection <= 0
          }

          onClick={
            previous
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

          {
            currentSection + 1
          } / {
            sections.length
          }

        </Badge>


        <Button

          type="button"

          variant="outline"

          disabled={
            currentSection >=
            sections.length - 1
          }

          onClick={
            next
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