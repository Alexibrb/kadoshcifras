'use client';

import {
  useEffect,
} from 'react';


export function OfflineNavigation() {

  useEffect(() => {


    const handleClick = (
      event: MouseEvent
    ) => {


      /*
      ==================================================
      ONLINE
      ==================================================
      */

      if (
        navigator.onLine
      ) {

        return;

      }


      const target =
        event.target as
          HTMLElement | null;


      const anchor =
        target?.closest(
          'a'
        ) as
          HTMLAnchorElement | null;


      if (!anchor) {

        return;

      }


      const href =
        anchor.getAttribute(
          'href'
        );


      if (!href) {

        return;

      }


      /*
      ==================================================
      IGNORAR LINKS EXTERNOS
      ==================================================
      */

      if (
        href.startsWith(
          'http://'
        ) ||
        href.startsWith(
          'https://'
        ) ||
        href.startsWith(
          'mailto:'
        ) ||
        href.startsWith(
          'tel:'
        ) ||
        href.startsWith(
          '#'
        )
      ) {

        return;

      }


      if (
        !href.startsWith('/')
      ) {

        return;

      }


      /*
      ==================================================
      PARAR NAVEGAÇÃO DO NEXT
      ==================================================
      */

      event.preventDefault();

      event.stopPropagation();


      const url =
        new URL(
          href,
          window.location.origin
        );


      const pathname =
        url.pathname;


      /*
      ==================================================
      MÚSICA
      ==================================================

      /songs/ABC123

      Não captura:

      /songs
      /songs/new
      /songs/ABC123/edit
      ==================================================
      */

      const songMatch =
        pathname.match(
          /^\/songs\/([^/]+)$/
        );


      if (
        songMatch &&
        songMatch[1] !== 'new'
      ) {

        const songId =
          songMatch[1];


        const offlineUrl =
          new URL(
            '/offline-song',
            window.location.origin
          );


        offlineUrl.searchParams.set(
          'id',
          songId
        );


        /*
        ------------------------------------------
        MANTER TRANSPOSIÇÃO
        ------------------------------------------
        */

        const transpose =
          url.searchParams.get(
            'transpose'
          );


        if (
          transpose !== null
        ) {

          offlineUrl.searchParams.set(
            'transpose',
            transpose
          );

        }


        /*
        ------------------------------------------
        ORIGEM DO REPERTÓRIO
        ------------------------------------------
        */

        const fromSetlist =
          url.searchParams.get(
            'fromSetlist'
          );


        if (fromSetlist) {

          offlineUrl.searchParams.set(
            'fromSetlist',
            fromSetlist
          );

        }


        console.info(
          '[PWA] Abrindo música offline:',
          songId
        );


        window.location.assign(
          offlineUrl.pathname +
          offlineUrl.search
        );


        return;

      }


      /*
      ==================================================
      REPERTÓRIO
      ==================================================
      */

      const setlistMatch =
        pathname.match(
          /^\/setlists\/([^/]+)$/
        );


      if (
        setlistMatch &&
        setlistMatch[1] !== 'new'
      ) {

        const setlistId =
          setlistMatch[1];


        console.info(
          '[PWA] Abrindo repertório offline:',
          setlistId
        );


        window.location.assign(

          `/offline-setlist?id=${encodeURIComponent(
            setlistId
          )}`

        );


        return;

      }


      /*
      ==================================================
      LINKS NORMAIS
      ==================================================

      Dashboard
      músicas
      repertórios
      ferramentas
      etc.
      ==================================================
      */

      console.info(
        '[PWA] Navegação offline:',
        href
      );


      window.location.assign(
        href
      );

    };


    document.addEventListener(
      'click',
      handleClick,
      true
    );


    return () => {

      document.removeEventListener(
        'click',
        handleClick,
        true
      );

    };


  }, []);


  return null;

}