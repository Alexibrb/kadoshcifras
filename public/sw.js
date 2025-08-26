// public/sw.js

const CACHE_NAME = 'cifrafacil-cache-v1.3'; // Incremented version
const OFFLINE_URL = '/offline.html';
const APP_SHELL_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/favicon-16x16.png',
  '/logocifrafacil.png',
  '/offline.html',
  // Rotas principais
  '/dashboard',
  '/songs',
  '/setlists',
  '/tools',
  '/login',
  '/signup',
  '/pending-approval',
  // Página de "molde" para músicas e repertórios
  // Assegure-se que essas rotas possam renderizar uma "shell" ou "skeleton"
  // para serem preenchidas com dados do cache do Firestore.
  // No Next.js, isso geralmente significa que a página base do app router está em cache.
];


// Instalação do Service Worker: Cacheia o App Shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(APP_SHELL_URLS);
      })
      .catch(error => {
        console.error('Failed to cache App Shell:', error);
      })
  );
});

// Ativação do Service Worker: Limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});


// Interceptação de Requisições: Estratégia Network Falling Back to Cache
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET ou que são para a API do Firebase/Genkit
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebaseinstallations.googleapis.com') ||
    event.request.url.includes('/ai/')
  ) {
    return;
  }

  // Para navegações HTML, use a estratégia Network Falling Back to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Se a resposta da rede for bem-sucedida, armazene-a no cache e retorne-a
          return caches.open(CACHE_NAME).then(cache => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
        .catch(() => {
          // Se a rede falhar, tente obter do cache
          return caches.match(event.request)
            .then(cachedResponse => {
               if (cachedResponse) {
                   return cachedResponse;
               }

               // Fallback inteligente para páginas dinâmicas não cacheadas
               // Tenta servir a página principal se o item específico não existir
               if (event.request.url.includes('/songs/')) {
                   return caches.match('/songs');
               }
               if (event.request.url.includes('/setlists/')) {
                   return caches.match('/setlists');
               }

               // Se nada for encontrado, mostra a página offline genérica
               return caches.match(OFFLINE_URL);
            });
        })
    );
  } else {
    // Para outros recursos (CSS, JS, Imagens), use a estratégia Cache First
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Retorna do cache se encontrado
          if (cachedResponse) {
            return cachedResponse;
          }
          // Caso contrário, busca na rede, armazena em cache e retorna
          return fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
              if (networkResponse && networkResponse.status === 200) {
                 cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            });
          });
        })
    );
  }
});
