'use client';

import { useEffect, useMemo } from 'react';

import {
  useFirestoreCollection,
} from '@/hooks/use-firestore-collection';

import {
  useAuth,
} from '@/hooks/use-auth';

import type {
  Song,
  Setlist,
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


/*
==================================================
SINCRONIZAÇÃO PARA USO OFFLINE
==================================================
*/

export function OfflineDataSync() {

  const {
    appUser,
  } = useAuth();


  const enabled =
    Boolean(
      appUser?.isApproved
    );


  /*
  ==================================================
  MÚSICAS
  ==================================================
  */

  const {
    data: songs,
  } =
    useFirestoreCollection<Song>(
      'songs',
      undefined,
      [],
      enabled
    );


  /*
  ==================================================
  REPERTÓRIOS
  ==================================================
  */

  const {
    data: setlists,
  } =
    useFirestoreCollection<Setlist>(
      'setlists',
      undefined,
      [],
      enabled
    );


  /*
  ==================================================
  MAPA DE MÚSICAS
  ==================================================
  */

  const songsById =
    useMemo(() => {

      const map =
        new Map<string, Song>();


      songs.forEach(
        song => {

          map.set(
            song.id,
            song
          );

        }
      );


      return map;

    }, [songs]);


  /*
  ==================================================
  SALVAR MÚSICAS INDIVIDUAIS
  ==================================================
  */

  useEffect(() => {

    if (
      typeof window ===
      'undefined'
    ) {

      return;

    }


    songs.forEach(
      song => {

        try {

          localStorage.setItem(

            `offline-song-${song.id}`,

            JSON.stringify(
              song
            )

          );

        } catch (error) {

          console.warn(
            '[Offline] Não foi possível armazenar música:',
            song.id
          );

        }

      }
    );


    if (
      songs.length > 0
    ) {

      console.info(
        `[Offline] ${songs.length} músicas preparadas.`
      );

    }

  }, [songs]);


  /*
  ==================================================
  SALVAR REPERTÓRIOS COMPLETOS
  ==================================================
  */

  useEffect(() => {

    if (
      typeof window ===
      'undefined'
    ) {

      return;

    }


    if (
      songs.length === 0 ||
      setlists.length === 0
    ) {

      return;

    }


    setlists.forEach(
      setlist => {

        try {

          const offlineSongs:
            OfflineSong[] =
              [];


          for (
            const setlistSong
            of setlist.songs || []
          ) {

            const song =
              songsById.get(
                setlistSong.songId
              );


            if (!song) {

              continue;

            }


            offlineSongs.push({

              id:
                song.id,

              title:
                song.title,

              artist:
                song.artist,

              content:
                song.content,

              key:
                song.key,

              initialTranspose:
                setlistSong.transpose || 0,

            });

          }


          /*
          ------------------------------------------
          Só grava quando conseguiu montar
          corretamente o repertório.
          ------------------------------------------
          */

          if (
            offlineSongs.length === 0
          ) {

            return;

          }


          const offlineData:
            OfflineSetlist = {

            id:
              setlist.id,

            name:
              setlist.name,

            songs:
              offlineSongs,

          };


          localStorage.setItem(

            `offline-setlist-${setlist.id}`,

            JSON.stringify(
              offlineData
            )

          );


        } catch (error) {

          console.warn(
            '[Offline] Erro preparando repertório:',
            setlist.id
          );

        }

      }
    );


    console.info(
      `[Offline] ${setlists.length} repertórios preparados.`
    );


  }, [
    songs,
    setlists,
    songsById,
  ]);


  return null;

}