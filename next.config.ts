
import type {NextConfig} from 'next';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https$:\/\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'http-cache',
      },
    },
  ],
  // Garante que o service worker funcione no modo de desenvolvimento para testes
  disable: false, 
  // Pré-cacheia as rotas mais importantes para o acesso inicial offline
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({url}) => {
            return url.pathname === '/' || url.pathname === '/login' || url.pathname === '/signup';
        },
        handler: 'NetworkFirst',
        options: {
            cacheName: 'start-url-cache',
        },
      }
    ]
  }
});


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
    position: 'bottom-right',
  },
  transpilePackages: ['next-themes'],
};

export default withPWA(nextConfig);
