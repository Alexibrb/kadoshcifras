/*
==================================================
CIFRAS KADOSH
SERVICE WORKER
==================================================
*/

const CACHE_VERSION = 'cifras-kadosh-v4';

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
  '/dashboard',
  '/songs',
  '/songs/new',
  '/setlists',
  '/setlists/new',
  '/tools',

  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
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


                    console.info(
                      '[SW] Cache inicial:',
                      url
                    );

                  }

                } catch (error) {

                  console.warn(
                    '[SW] Não foi possível armazenar:',
                    url
                  );

                }

              }
            )

          );

        })

    );


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

                  console.info(
                    '[SW] Removendo cache antigo:',
                    cacheName
                  );


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
    ------------------------------------------------
    APENAS GET
    ------------------------------------------------
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
    ------------------------------------------------
    SOMENTE O PRÓPRIO SITE
    ------------------------------------------------
    */

    if (
      url.origin !==
      self.location.origin
    ) {

      return;

    }


    /*
    ------------------------------------------------
    IGNORAR API
    ------------------------------------------------
    */

    if (
      url.pathname.startsWith(
        '/api/'
      )
    ) {

      return;

    }


    /*
    ------------------------------------------------
    IGNORAR HOT RELOAD
    ------------------------------------------------
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
    ==================================================
    NAVEGAÇÃO HTML
    ==================================================
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
    ==================================================
    NEXT.JS RSC
    ==================================================
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
    ==================================================
    ARQUIVOS ESTÁTICOS
    ==================================================
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
    ==================================================
    OUTRAS REQUISIÇÕES
    ==================================================
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
NAVEGAÇÃO
NETWORK FIRST
==================================================
*/

async function networkFirstNavigation(
  request
) {

  const runtimeCache =
    await caches.open(
      RUNTIME_CACHE
    );


  try {

    /*
    ------------------------------------------------
    ONLINE
    ------------------------------------------------
    */

    const response =
      await fetch(
        request
      );


    if (
      response &&
      response.ok
    ) {

      /*
      ----------------------------------------------
      GUARDA A PÁGINA VISITADA
      ----------------------------------------------
      */

      await runtimeCache.put(
        request,
        response.clone()
      );


      /*
      ----------------------------------------------
      TAMBÉM GUARDA SOMENTE PELO PATHNAME

      Evita problemas com parâmetros de URL.
      ----------------------------------------------
      */

      const requestUrl =
        new URL(
          request.url
        );


      const cleanRequest =
        new Request(
          requestUrl.origin +
          requestUrl.pathname
        );


      await runtimeCache.put(
        cleanRequest,
        response.clone()
      );

    }


    return response;


  } catch (error) {


    /*
    ==================================================
    OFFLINE
    ==================================================
    */


    /*
    ------------------------------------------------
    1. TENTAR A REQUISIÇÃO EXATA
    ------------------------------------------------
    */

    const exactPage =
      await runtimeCache.match(
        request
      );


    if (exactPage) {

      console.info(
        '[SW] Navegação offline pelo runtime cache.'
      );


      return exactPage;

    }


    /*
    ------------------------------------------------
    2. TENTAR APENAS PATHNAME
    ------------------------------------------------
    */

    const url =
      new URL(
        request.url
      );


    const cleanRequest =
      new Request(
        url.origin +
        url.pathname
      );


    const pathPage =
      await runtimeCache.match(
        cleanRequest
      );


    if (pathPage) {

      console.info(
        '[SW] Navegação offline pelo pathname.'
      );


      return pathPage;

    }


    /*
    ------------------------------------------------
    3. TENTAR CACHE ESTÁTICO
    ------------------------------------------------
    */

    const staticCache =
      await caches.open(
        STATIC_CACHE
      );


    /*
    ------------------------------------------------
    TENTA A ROTA EXATA NO CACHE ESTÁTICO
    ------------------------------------------------
    */

    const staticExact =
      await staticCache.match(
        url.pathname
      );


    if (staticExact) {

      console.info(
        '[SW] Navegação offline pelo cache estático.'
      );


      return staticExact;

    }


    /*
    ------------------------------------------------
    4. IMPORTANTE:

    SE O PWA ESTIVER SENDO ABERTO DO ZERO,
    USA A PÁGINA PRINCIPAL "/" DO APP.

    Esse era o ponto que estava faltando.
    ------------------------------------------------
    */

    const homePage =
      await staticCache.match(
        '/'
      );


    if (homePage) {

      console.info(
        '[SW] Inicialização offline usando App Shell.'
      );


      return homePage;

    }


    /*
    ------------------------------------------------
    5. ÚLTIMO FALLBACK
    ------------------------------------------------
    */

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

        status:
          503,

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
NEXT.JS RSC
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


  originalUrl.searchParams.delete(
    '_rsc'
  );


  const cacheKey =
    new Request(
      originalUrl.toString(),
      {
        method:
          'GET',

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
    ------------------------------------------------
    DEVOLVE IMEDIATAMENTE O CACHE
    ------------------------------------------------
    */

    /*
    ------------------------------------------------
    TENTA ATUALIZAR EM SEGUNDO PLANO
    ------------------------------------------------
    */

    fetch(
      request
    )
      .then(
        response => {

          if (
            response &&
            response.ok &&
            response.type ===
              'basic'
          ) {

            void cache.put(
              request,
              response.clone()
            );

          }

        }
      )
      .catch(
        () => {

          /*
          Offline.
          Mantém o cache existente.
          */

        }
      );


    return cached;

  }


  /*
  ------------------------------------------------
  PRIMEIRO ACESSO
  ------------------------------------------------
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