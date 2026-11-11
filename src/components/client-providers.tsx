'use client';

import {
  useEffect,
} from 'react';

import {
  AuthProvider,
} from '@/hooks/use-auth';

import {
  ThemeProvider,
} from '@/components/theme-provider';

import {
  Toaster,
} from '@/components/ui/toaster';

import {
  errorEmitter,
} from '@/firebase/error-emitter';

import {
  useToast,
} from '@/hooks/use-toast';

import {
  FirestorePermissionError,
} from '@/firebase/errors';

import {
  ServiceWorkerRegister,
} from '@/components/pwa/service-worker-register';

import {
  OfflineNavigation,
} from '@/components/pwa/offline-navigation';

import {
  OfflineDataSync,
} from '@/components/pwa/offline-data-sync';


/*
==================================================
ERROS DO FIREBASE
==================================================
*/

const FirebaseErrorListener =
  () => {

    const {
      toast,
    } =
      useToast();


    useEffect(() => {

      const handleError =
        (
          error:
            FirestorePermissionError
        ) => {


          if (
            process.env.NODE_ENV ===
            'development'
          ) {

            console.warn(

              'Permissão Negada (Debug):',

              error.context.path,

              error.context.operation

            );

          }


          if (
            error.context.operation !==
              'list' &&
            error.context.operation !==
              'get'
          ) {

            toast({

              variant:
                'destructive',

              title:
                'Ação não permitida',

              description:
                'Você não tem permissão para realizar esta operação.',

            });

          }

        };


      errorEmitter.on(

        'permission-error',

        handleError

      );


      return () => {

        errorEmitter.off(

          'permission-error',

          handleError

        );

      };


    }, [toast]);


    return null;

  };


/*
==================================================
PROVEDORES
==================================================
*/

export function ClientProviders({

  children,

}: {

  children:
    React.ReactNode;

}) {

  return (

    <AuthProvider>

      <ThemeProvider

        attribute="class"

        defaultTheme="light"

        enableSystem={false}

        disableTransitionOnChange

      >

        <FirebaseErrorListener />


        <ServiceWorkerRegister />


        <OfflineNavigation />


        <OfflineDataSync />


        {children}


        <Toaster />


      </ThemeProvider>

    </AuthProvider>

  );

}