// src/services/api-service.ts

// Este é um serviço de API simulado (mock).
// Ele retorna dados de exemplo para permitir que o aplicativo funcione sem um backend real.
// Em um aplicativo de produção, você substituiria isso por chamadas de API reais
// para o seu servidor (usando fetch, axios, etc.).

const MOCK_DATA = {
    collections: {
        songs: [
            { id: '1', title: 'Sonda-me, Usa-me', artist: 'Aline Barros', category: 'Adoração', genre: 'Gospel' },
            { id: '2', title: 'Ousado Amor', artist: 'Isaias Saad', category: 'Adoração', genre: 'Gospel' },
        ],
        artists: [
            { id: '1', name: 'Aline Barros' },
            { id: '2', name: 'Isaias Saad' },
        ],
        categories: [
            { id: '1', name: 'Adoração' },
            { id: '2', name: 'Louvor' },
        ],
        genres: [
            { id: '1', name: 'Gospel' },
            { id: '2', name: 'Pop Rock' },
        ]
    }
};

export const api = {
  get: async (url: string): Promise<{ data: any }> => {
    console.log(`[API MOCK] GET: ${url}`);
    if (url === '/collections') {
      return Promise.resolve({ data: MOCK_DATA });
    }
    return Promise.resolve({ data: null });
  },
};
