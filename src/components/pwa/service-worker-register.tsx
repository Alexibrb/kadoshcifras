'use client';

import {
  useEffect,
} from 'react';


export function ServiceWorkerRegister() {

  useEffect(() => {


    /*
    ==================================================
    NÃO REGISTRAR EM DESENVOLVIMENTO
    ==================================================

    Evita cache interferindo no Fast Refresh do Next.
    ==================================================
    */

    if (
      process.env.NODE_ENV !==
      'production'
    ) {

      console.info(
        '[PWA] Service Worker desativado em desenvolvimento.'
      );

      return;

    }


    /*
    ==================================================
    VERIFICAR SUPORTE
    ==================================================
    */

    if (
      !(
        'serviceWorker'
        in navigator
      )
    ) {

      console.warn(
        '[PWA] Service Worker não suportado neste navegador.'
      );

      return;

    }


    /*
    ==================================================
    REGISTRAR
    ==================================================
    */

    const register =
      async () => {

        try {

          const registration =
            await navigator
              .serviceWorker
              .register(
                '/sw.js',
                {
                  scope: '/',
                }
              );


          console.info(
            '[PWA] Service Worker registrado:',
            registration.scope
          );


          /*
          ==========================================
          VERIFICAR ATUALIZAÇÕES
          ==========================================
          */

          void registration.update();


        } catch (error) {

          console.error(
            '[PWA] Falha ao registrar Service Worker:',
            error
          );

        }

      };


    /*
    ==================================================
    AGUARDAR CARREGAMENTO
    ==================================================
    */

    if (
      document.readyState ===
      'complete'
    ) {

      void register();

    } else {

      window.addEventListener(
        'load',
        register
      );

    }


    return () => {

      window.removeEventListener(
        'load',
        register
      );

    };


  }, []);


  return null;

}