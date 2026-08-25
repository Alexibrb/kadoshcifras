/*
==================================================
CIFRAS KADOSH
SERVICE WORKER
==================================================
*/

const CACHE_VERSION = 'cifras-kadosh-v7';

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

  '/offline-song',
  '/offline-setlist',

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
MENSAGENS DO APLICATIVO
==================================================

Recebe URLs internas encontradas na interface.

Enquanto há internet, músicas, repertórios e
demais páginas são armazenados no runtime cache.
==================================================
*/

self.addEventListener(
  'message',
  event => {

    const data =
      event.data;


    if (
      !data ||
      data.type !== 'CACHE_URLS'
    ) {

      return;

    }


    const urls =
      Array.isArray(
        data.urls
      )
        ? data.urls
        : [];


    if (
      urls.length === 0
    ) {

      return;

    }


    event.waitUntil(
      cacheApplicationUrls(
        urls
      )
    );

  }
);


/*
==================================================
PRÉ-CACHE DE ROTAS DINÂMICAS
==================================================
*/

async function cacheApplicationUrls(
  urls
) {

  const cache =
    await caches.open(
      RUNTIME_CACHE
    );


  const uniqueUrls =
    [...new Set(urls)];


  for (
    const url of uniqueUrls
  ) {

    try {

      /*
      ----------------------------------------------
      Busca HTML normal.

      Não queremos RSC aqui.
      ----------------------------------------------
      */

      const response =
        await fetch(
          url,
          {

            method:
              'GET',

            credentials:
              'same-origin',

            headers: {

              Accept:
                'text/html,application/xhtml+xml',

            },

          }
        );


      if (
        !response ||
        !response.ok
      ) {

        continue;

      }


      const contentType =
        response.headers.get(
          'content-type'
        ) || '';


      if (
        !contentType.includes(
          'text/html'
        )
      ) {

        continue;

      }


      const absoluteUrl =
        new URL(
          url,
          self.location.origin
        );


      absoluteUrl.searchParams.delete(
        '_rsc'
      );


      const cacheKey =
        new Request(
          absoluteUrl.toString()
        );


      await cache.put(
        cacheKey,
        response.clone()
      );


      /*
      ----------------------------------------------
      Também guarda somente pelo pathname.

      Isso ajuda quando a URL chega com parâmetros.
      ----------------------------------------------
      */

      const pathnameKey =
        new Request(
          absoluteUrl.origin +
          absoluteUrl.pathname
        );


      await cache.put(
        pathnameKey,
        response.clone()
      );


      console.info(
        '[SW] Rota preparada para offline:',
        absoluteUrl.pathname
      );


    } catch (error) {

      console.warn(
        '[SW] Não foi possível preparar rota:',
        url
      );

    }

  }

}


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
      Guarda requisição exata
      ----------------------------------------------
      */

      await runtimeCache.put(
        request,
        response.clone()
      );


      /*
      ----------------------------------------------
      Guarda também somente pathname
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
    1. REQUISIÇÃO EXATA
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
    2. PATHNAME
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
    3. CACHE ESTÁTICO

    Serve as telas principais.
    ------------------------------------------------
    */

    const staticCache =
      await caches.open(
        STATIC_CACHE
      );


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
    4. FALLBACK OFFLINE

    IMPORTANTE:

    Não usamos mais "/" como fallback para músicas
    e repertórios desconhecidos.

    Isso evita voltar para a tela inicial quando uma
    rota dinâmica não estiver no cache.
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


    /*
    ------------------------------------------------
    Tenta também sem headers especiais do RSC.
    ------------------------------------------------
    */

    const cleanKey =
      new Request(
        originalUrl.origin +
        originalUrl.pathname
      );


    const cleanCached =
      await cache.match(
        cleanKey
      );


    if (cleanCached) {

      return cleanCached;

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
    Tenta atualizar silenciosamente em segundo plano
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
          Mantém cache atual.
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