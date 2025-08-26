
const CACHE_NAME = 'cifrafacil-cache-v1';
const urlsToCache = [
  '/',
  '/login',
  '/signup',
  '/dashboard',
  '/songs',
  '/setlists',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/logocifrafacil.png',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Cachear recursos essenciais.
        // Omitir requisições com 'chrome-extension'
        const cachePromises = urlsToCache.map(urlToCache => {
            const request = new Request(urlToCache, {mode: 'no-cors'});
            return fetch(request).then(response => cache.put(urlToCache, response));
        });

        return Promise.all(cachePromises);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});


self.addEventListener('fetch', event => {
    // Apenas lida com requisições de navegação
    if (event.request.mode !== 'navigate') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Resposta da rede bem-sucedida, clona e armazena no cache
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                return response;
            })
            .catch(() => {
                // Falha na rede, tenta buscar do cache
                return caches.match(event.request)
                    .then(response => {
                        if (response) {
                            return response;
                        }
                        // Se não estiver no cache, retorna a página principal como fallback para SPA
                        return caches.match('/');
                    });
            })
    );
});
