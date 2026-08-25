import type {
  Metadata,
  Viewport,
} from 'next';

import {
  Alegreya,
} from 'next/font/google';

import './globals.css';

import {
  ClientProviders,
} from '@/components/client-providers';


/*
==================================================
FONTE
==================================================

O Next baixa a fonte durante o build e depois
serve os arquivos localmente junto com o app.

O aparelho não precisa acessar Google Fonts.
==================================================
*/

const alegreya =
  Alegreya({

    subsets: [
      'latin',
    ],

    weight: [
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
    ],

    style: [
      'normal',
      'italic',
    ],

    variable:
      '--font-alegreya',

    display:
      'swap',

  });


/*
==================================================
METADATA
==================================================
*/

export const metadata:
  Metadata = {

  title:
    'CifrasKadosh',

  description:
    'Seu companheiro para criar, gerenciar e apresentar músicas.',

  manifest:
    '/manifest.json',

  appleWebApp: {

    capable:
      true,

    statusBarStyle:
      'default',

    title:
      'CifrasKadosh',

  },

  formatDetection: {

    telephone:
      false,

  },

};


/*
==================================================
VIEWPORT
==================================================
*/

export const viewport:
  Viewport = {

  themeColor:
    '#673AB7',

  width:
    'device-width',

  initialScale:
    1,

};


/*
==================================================
ROOT LAYOUT
==================================================
*/

export default function RootLayout({

  children,

}: Readonly<{

  children:
    React.ReactNode;

}>) {

  return (

    <html
      lang="pt-BR"
      suppressHydrationWarning
    >

      <head>

        <link

          rel="apple-touch-icon"

          href="/icon-512x512.png"

        />


        <meta

          name="apple-mobile-web-app-capable"

          content="yes"

        />


        <meta

          name="mobile-web-app-capable"

          content="yes"

        />


        <meta

          name="apple-mobile-web-app-status-bar-style"

          content="default"

        />

      </head>


      <body

        className={`
          ${alegreya.variable}
          font-body
          antialiased
        `}

      >

        <ClientProviders>

          {children}

        </ClientProviders>

      </body>

    </html>

  );

}