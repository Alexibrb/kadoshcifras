
import type {NextConfig} from 'next';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: ({url}) => {
          return url.pathname === '/' || url.pathname === '/login' || url.pathname === '/signup';
      },
      handler: 'NetworkFirst',
      options: {
          cacheName: 'start-url-cache',
      },
    },
    {
      urlPattern: /^https$:\/\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'http-cache',
      },
    },
  ],
  disable: false, 
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
