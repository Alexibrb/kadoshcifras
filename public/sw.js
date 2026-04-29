self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // O Service Worker é obrigatório para instalação, 
  // mesmo que não realize cache agressivo por enquanto.
});