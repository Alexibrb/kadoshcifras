// Versão do Cache - Mude este valor para forçar a atualização do cache
const CACHE_VERSION = 11;
const STATIC_CACHE_NAME = `static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `dynamic-v${CACHE_VERSION}`;

// Arquivos essenciais do App Shell para serem cacheados na instalação
const APP_SHELL_ASSETS = [
  '/',
  '/login',
  '/signup',
  '/manifest.json',
  '/favicon.ico',
  '/logocifrafacil.png',
  '/offline.html',
  '/songs/index.html', // Molde para páginas de música
];

// 1. Estratégia de Instalação: Cachear o App Shell
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Pré-cacheando o App Shell');
      // Usamos addAll para garantir que todos os assets sejam cacheados. Se um falhar, a instalação falha.
      return cache.addAll(APP_SHELL_ASSETS).catch(error => {
        console.error('[SW] Falha ao pré-cachear o App Shell:', error);
      });
    })
  );
});

// 2. Estratégia de Ativação: Limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Garante que o SW ativo controle a página imediatamente
});

// Helper para verificar se a requisição é uma navegação
function isNavigationRequest(event) {
  return event.request.mode === 'navigate';
}

// 3. Estratégia de Fetch: Stale-While-Revalidate com fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições do Firebase e extensões do Chrome
  if (url.origin.startsWith('https://firestore.googleapis.com') || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Estratégia: Stale-While-Revalidate
  event.respondWith(
    caches.open(DYNAMIC_CACHE_NAME).then(async (cache) => {
      // 1. Tenta pegar do cache primeiro
      const cachedResponse = await cache.match(request);
      
      // 2. Enquanto isso, busca na rede para atualizar o cache
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Se a busca for bem-sucedida, atualiza o cache dinâmico
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }).catch(async () => {
        // Se a rede falhar, precisamos de um fallback
        
        // Se for uma requisição de navegação (mudança de página)
        if (isNavigationRequest(event)) {
          // Para páginas de músicas, usa o molde
          if (url.pathname.startsWith('/songs/')) {
             const songShell = await caches.match('/songs/index.html');
             return songShell || caches.match('/offline.html');
          }
           // Para outras páginas, tenta encontrar no cache estático
          const cachedPage = await caches.match(url.pathname);
          return cachedPage || caches.match('/offline.html');
        }
        
        // Para outros tipos de assets (imagens, etc.), não fazemos nada, apenas deixamos a falha acontecer.
        // O `cachedResponse` já terá sido retornado se existir.
      });

      // Retorna a resposta do cache imediatamente se existir, caso contrário, espera a resposta da rede (ou o fallback).
      return cachedResponse || fetchPromise;
    })
  );
});
