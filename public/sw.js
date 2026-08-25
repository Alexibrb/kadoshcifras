/*
==================================================
CIFRAS KADOSH
SERVICE WORKER
==================================================
*/

const CACHE_VERSION = 'cifras-kadosh-v2';

const STATIC_CACHE =
  `${CACHE_VERSION}-static`;

const RUNTIME_CACHE =
  `${CACHE_VERSION}-runtime`;


/*
==================================================
ARQUIVOS ESSENCIAIS
==================================================
*/

const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
];


/*
==================================================
INSTALAÇÃO
==================================================
*/

self.addEventListener(
  'install',
  event => {

    event.waitUntil(

      caches
        .open(STATIC_CACHE)
        .then(async cache => {

          await Promise.allSettled(

            APP_SHELL.map(
              async url => {

                try {

                  const response =
                    await fetch(
                      url,
                      {
                        cache: 'reload',
                      }
                    );


                  if (response.ok) {

                    await cache.put(
                      url,
                      response.clone()
                    );

                  }

                } catch (error) {

                  console.warn(
                    '[SW] Falha ao armazenar:',
                    url
                  );

                }

              }
            )

          );

        })

    );


    /*
    ==============================================
    ATIVAR NOVA VERSÃO IMEDIATAMENTE
    ==============================================
    */

    self.skipWaiting();

  }
);


/*
==================================================
ATIVAÇÃO
==================================================
*/

self.addEventListener(
  'activate',
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(cacheNames => {

          return Promise.all(

            cacheNames.map(
              cacheName => {

                if (
                  cacheName.startsWith(
                    'cifras-kadosh-'
                  ) &&
                  cacheName !== STATIC_CACHE &&
                  cacheName !== RUNTIME_CACHE
                ) {

                  return caches.delete(
                    cacheName
                  );

                }


                return Promise.resolve();

              }
            )

          );

        })
        .then(() => {

          return self.clients.claim();

        })

    );

  }
);


/*
==================================================
FETCH
==================================================
*/

self.addEventListener(
  'fetch',
  event => {

    const request =
      event.request;


    /*
    ==============================================
    APENAS GET
    ==============================================
    */

    if (
      request.method !== 'GET'
    ) {

      return;

    }


    const url =
      new URL(
        request.url
      );


    /*
    ==============================================
    SOMENTE RECURSOS DO PRÓPRIO APP
    ==============================================

    Firebase / Firestore continua sendo controlado
    pelo SDK e IndexedDB da Fase 1.
    ==============================================
    */

    if (
      url.origin !==
      self.location.origin
    ) {

      return;

    }


    /*
    ==============================================
    IGNORAR APIs
    ==============================================
    */

    if (
      url.pathname.startsWith(
        '/api/'
      )
    ) {

      return;

    }


    /*
    ==============================================
    IGNORAR HOT RELOAD
    ==============================================
    */

    if (
      url.pathname.includes(
        'webpack-hmr'
      ) ||
      url.pathname.includes(
        'hot-update'
      )
    ) {

      return;

    }


    /*
    ==============================================
    NAVEGAÇÃO HTML
    ==============================================
    */

    if (
      request.mode ===
      'navigate'
    ) {

      event.respondWith(
        networkFirstNavigation(
          request
        )
      );

      return;

    }


    /*
    ==============================================
    NEXT.JS RSC

    O Next adiciona um parâmetro _rsc variável.
    Removemos esse parâmetro da chave do cache para
    que a mesma página possa ser encontrada offline.
    ==============================================
    */

    if (
      url.searchParams.has(
        '_rsc'
      )
    ) {

      event.respondWith(
        networkFirstRSC(
          request
        )
      );

      return;

    }


    /*
    ==============================================
    ARQUIVOS ESTÁTICOS
    ==============================================
    */

    if (
      url.pathname.startsWith(
        '/_next/static/'
      ) ||
      request.destination ===
        'style' ||
      request.destination ===
        'script' ||
      request.destination ===
        'font' ||
      request.destination ===
        'image'
    ) {

      event.respondWith(
        cacheFirst(
          request
        )
      );

      return;

    }


    /*
    ==============================================
    DEMAIS REQUISIÇÕES
    ==============================================
    */

    event.respondWith(
      networkFirst(
        request
      )
    );

  }
);


/*
==================================================
NAVEGAÇÃO - NETWORK FIRST
==================================================
*/

async function networkFirstNavigation(
  request
) {

  const cache =
    await caches.open(
      RUNTIME_CACHE
    );


  try {

    const response =
      await fetch(
        request
      );


    if (
      response &&
      response.ok
    ) {

      await cache.put(
        request,
        response.clone()
      );

    }


    return response;


  } catch (error) {


    /*
    ==============================================
    PÁGINA EXATA
    ==============================================
    */

    const cachedPage =
      await cache.match(
        request
      );


    if (cachedPage) {

      return cachedPage;

    }


    /*
    ==============================================
    TENTAR PELO PATHNAME
    ==============================================
    */

    const url =
      new URL(
        request.url
      );


    const pathRequest =
      new Request(
        url.origin +
        url.pathname
      );


    const cachedPath =
      await cache.match(
        pathRequest
      );


    if (cachedPath) {

      return cachedPath;

    }


    /*
    ==============================================
    FALLBACK OFFLINE
    ==============================================
    */

    const staticCache =
      await caches.open(
        STATIC_CACHE
      );


    const offlinePage =
      await staticCache.match(
        '/offline.html'
      );


    if (offlinePage) {

      return offlinePage;

    }


    return new Response(
      'CifrasKadosh está offline.',
      {
        status: 503,

        headers: {
          'Content-Type':
            'text/plain; charset=utf-8',
        },
      }
    );

  }

}


/*
==================================================
NEXT RSC - NETWORK FIRST
==================================================
*/

async function networkFirstRSC(
  request
) {

  const cache =
    await caches.open(
      RUNTIME_CACHE
    );


  const originalUrl =
    new URL(
      request.url
    );


  /*
  ==============================================
  REMOVER PARÂMETRO ALEATÓRIO DO NEXT
  ==============================================
  */

  originalUrl.searchParams.delete(
    '_rsc'
  );


  const cacheKey =
    new Request(
      originalUrl.toString(),
      {
        method: 'GET',
        headers:
          request.headers,
      }
    );


  try {

    const response =
      await fetch(
        request
      );


    if (
      response &&
      response.ok
    ) {

      await cache.put(
        cacheKey,
        response.clone()
      );

    }


    return response;


  } catch (error) {


    const cached =
      await cache.match(
        cacheKey
      );


    if (cached) {

      return cached;

    }


    return Response.error();

  }

}


/*
==================================================
NETWORK FIRST
==================================================
*/

async function networkFirst(
  request
) {

  const cache =
    await caches.open(
      RUNTIME_CACHE
    );


  try {

    const response =
      await fetch(
        request
      );


    if (
      response &&
      response.ok &&
      response.type ===
        'basic'
    ) {

      await cache.put(
        request,
        response.clone()
      );

    }


    return response;


  } catch (error) {


    const cached =
      await cache.match(
        request
      );


    if (cached) {

      return cached;

    }


    return Response.error();

  }

}


/*
==================================================
CACHE FIRST
==================================================
*/

async function cacheFirst(
  request
) {

  const cache =
    await caches.open(
      RUNTIME_CACHE
    );


  const cached =
    await cache.match(
      request
    );


  if (cached) {


    /*
    ==============================================
    ATUALIZA EM SEGUNDO PLANO
    ==============================================
    */

    fetch(
      request
    )
      .then(response => {

        if (
          response &&
          response.ok &&
          response.type ===
            'basic'
        ) {

          cache.put(
            request,
            response.clone()
          );

        }

      })
      .catch(() => {

        /*
        Offline.
        Usa versão já armazenada.
        */

      });


    return cached;

  }


  /*
  ==============================================
  NÃO ESTÁ NO CACHE
  ==============================================
  */

  try {

    const response =
      await fetch(
        request
      );


    if (
      response &&
      response.ok &&
      response.type ===
        'basic'
    ) {

      await cache.put(
        request,
        response.clone()
      );

    }


    return response;


  } catch (error) {

    return Response.error();

  }

}