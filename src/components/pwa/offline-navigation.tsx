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
      ==============================================
      ONLINE
      ==============================================

      Quando há internet, o Next.js continua
      navegando normalmente.
      ==============================================
      */

      if (navigator.onLine) {

        return;

      }


      /*
      ==============================================
      LOCALIZAR LINK CLICADO
      ==============================================
      */

      const target =
        event.target as HTMLElement | null;


      const anchor =
        target?.closest(
          'a'
        ) as HTMLAnchorElement | null;


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
      ==============================================
      IGNORAR LINKS EXTERNOS
      ==============================================
      */

      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {

        return;

      }


      /*
      ==============================================
      IGNORAR HASH
      ==============================================
      */

      if (
        href.startsWith('#')
      ) {

        return;

      }


      /*
      ==============================================
      NAVEGAÇÃO OFFLINE
      ==============================================

      Impede o Next Link de tentar buscar RSC.

      Faz navegação completa para que o Service
      Worker possa devolver o HTML salvo no cache.
      ==============================================
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