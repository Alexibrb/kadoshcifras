'use client';

import {
  useEffect,
} from 'react';


export function OfflineNavigation() {

  useEffect(() => {

    let observer:
      MutationObserver | null = null;

    let timer:
      ReturnType<typeof setTimeout> | null = null;


    /*
    ==================================================
    COLETAR LINKS INTERNOS
    ==================================================
    */

    const getInternalLinks = () => {

      const anchors =
        Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
            'a[href]'
          )
        );


      const urls =
        new Set<string>();


      anchors.forEach(
        anchor => {

          const href =
            anchor.getAttribute(
              'href'
            );


          if (!href) {

            return;

          }


          /*
          ------------------------------------------
          SOMENTE LINKS INTERNOS
          ------------------------------------------
          */

          if (
            !href.startsWith('/')
          ) {

            return;

          }


          /*
          ------------------------------------------
          IGNORAR HASH
          ------------------------------------------
          */

          if (
            href.startsWith('/#')
          ) {

            return;

          }


          /*
          ------------------------------------------
          ROTAS QUE QUEREMOS DISPONÍVEIS OFFLINE
          ------------------------------------------
          */

          const shouldCache =

            href === '/' ||

            href.startsWith(
              '/dashboard'
            ) ||

            href.startsWith(
              '/songs'
            ) ||

            href.startsWith(
              '/setlists'
            ) ||

            href.startsWith(
              '/tools'
            );


          if (!shouldCache) {

            return;

          }


          urls.add(href);

        }
      );


      return Array.from(urls);

    };


    /*
    ==================================================
    ENVIAR ROTAS PARA O SERVICE WORKER
    ==================================================
    */

    const cacheVisibleRoutes =
      async () => {

        /*
        ------------------------------------------
        SOMENTE ONLINE
        ------------------------------------------
        */

        if (!navigator.onLine) {

          return;

        }


        if (
          !(
            'serviceWorker'
            in navigator
          )
        ) {

          return;

        }


        try {

          const registration =
            await navigator
              .serviceWorker
              .ready;


          const worker =

            registration.active ||

            navigator.serviceWorker
              .controller;


          if (!worker) {

            return;

          }


          const urls =
            getInternalLinks();


          if (
            urls.length === 0
          ) {

            return;

          }


          worker.postMessage({

            type:
              'CACHE_URLS',

            urls,

          });


          console.info(
            `[PWA] Solicitado cache de ${urls.length} rotas.`
          );


        } catch (error) {

          console.warn(
            '[PWA] Não foi possível preparar rotas offline:',
            error
          );

        }

      };


    /*
    ==================================================
    AGENDAR CACHE
    ==================================================

    As músicas chegam depois pelo Firestore.
    Por isso observamos mudanças na página.
    ==================================================
    */

    const scheduleCache = () => {

      if (
        !navigator.onLine
      ) {

        return;

      }


      if (timer) {

        clearTimeout(
          timer
        );

      }


      timer =
        setTimeout(
          () => {

            void cacheVisibleRoutes();

          },
          700
        );

    };


    /*
    ==================================================
    NAVEGAÇÃO OFFLINE
    ==================================================
    */

    const handleClick = (
      event: MouseEvent
    ) => {


      /*
      ------------------------------------------
      ONLINE

      Deixa o Next funcionar normalmente.
      ------------------------------------------
      */

      if (navigator.onLine) {

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
      ------------------------------------------
      SOMENTE LINKS INTERNOS
      ------------------------------------------
      */

      if (
        !href.startsWith('/')
      ) {

        return;

      }


      /*
      ------------------------------------------
      NAVEGAÇÃO COMPLETA

      Evita o Next tentar buscar RSC pela rede.
      ------------------------------------------
      */

      event.preventDefault();

      event.stopPropagation();


      console.info(
        '[PWA] Navegação offline:',
        href
      );


      window.location.assign(
        href
      );

    };


    /*
    ==================================================
    LISTENERS
    ==================================================
    */

    document.addEventListener(
      'click',
      handleClick,
      true
    );


    /*
    ------------------------------------------------
    QUANDO INTERNET VOLTAR
    ------------------------------------------------
    */

    window.addEventListener(
      'online',
      scheduleCache
    );


    /*
    ------------------------------------------------
    OBSERVAR MÚSICAS / REPERTÓRIOS SENDO CARREGADOS
    ------------------------------------------------
    */

    observer =
      new MutationObserver(
        () => {

          scheduleCache();

        }
      );


    observer.observe(
      document.body,
      {

        childList:
          true,

        subtree:
          true,

      }
    );


    /*
    ------------------------------------------------
    PRIMEIRO CACHE
    ------------------------------------------------
    */

    scheduleCache();


    /*
    ==================================================
    CLEANUP
    ==================================================
    */

    return () => {

      document.removeEventListener(
        'click',
        handle