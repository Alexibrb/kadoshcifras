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
            { id: '3', title: 'Lugar Secreto', artist: 'Gabriela Rocha', category: 'Adoração', genre: 'Gospel' },
            { id: '4', title: 'Algo Novo', artist: 'Kemuel', category: 'Louvor', genre: 'Pop' },
            { id: '5', title: 'A Casa É Sua', artist: 'Casa Worship', category: 'Adoração', genre: 'Gospel' },
            { id: '6', title: 'Girassol', artist: 'Priscilla Alcantara', category: 'Pop', genre: 'Pop' },
            { id: '7', title: 'Deus Proverá', artist: 'Gabriela Gomes', category: 'Adoração', genre: 'Gospel' },
            { id: '8', title: 'Em Teus Braços', artist: 'Laura Souguellis', category: 'Adoração', genre: 'Gospel' }
        ],
        artists: [
            { id: '1', name: 'Aline Barros' },
            { id: '2', name: 'Isaias Saad' },
            { id: '3', name: 'Gabriela Rocha' },
            { id: '4', name: 'Kemuel' },
            { id: '5', name: 'Casa Worship' },
            { id: '6', name: 'Priscilla Alcantara' },
            { id: '7', name: 'Gabriela Gomes' },
            { id: '8', name: 'Laura Souguellis' }
        ],
        categories: [
            { id: '1', name: 'Adoração' },
            { id: '2', name: 'Louvor' },
            { id: '3', name: 'Pop' }
        ],
        genres: [
            { id: '1', name: 'Gospel' },
            { id: '2', name: 'Pop Rock' },
            { id: '3', name: 'Pop' }
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
