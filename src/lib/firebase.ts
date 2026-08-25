// src/lib/firebase.ts

import {
  initializeApp,
  getApps,
  getApp,
  FirebaseApp,
} from "firebase/app";

import {
  Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";


/*
==================================================
CONFIGURAÇÃO FIREBASE
==================================================
*/

const firebaseConfig = {
  apiKey: "AIzaSyDKVX_Et75ezt-GlIl7uSMPNftGe3pAQe0",
  authDomain: "music-pal-63rrp.firebaseapp.com",
  projectId: "music-pal-63rrp",
  storageBucket: "music-pal-63rrp.firebasestorage.app",
  messagingSenderId: "682160842216",
  appId: "1:682160842216:web:f5329c818ff76a7ac4705d",
};


/*
==================================================
INICIALIZAR FIREBASE
==================================================
*/

const app: FirebaseApp =
  !getApps().length
    ? initializeApp(firebaseConfig)
    : getApp();


/*
==================================================
FIRESTORE
==================================================
*/

let db: Firestore;


/*
--------------------------------------------------
No navegador:

IndexedDB persistente
+
suporte a múltiplas abas
--------------------------------------------------
*/

if (typeof window !== "undefined") {

  try {

    db = initializeFirestore(app, {

      localCache: persistentLocalCache({

        tabManager:
          persistentMultipleTabManager(),

      }),

    });


    console.info(
      "Firestore offline: persistência local ativada."
    );


  } catch (error) {

    /*
    ------------------------------------------------
    Fallback de segurança.

    Pode ocorrer em Hot Reload ou se o Firestore
    já tiver sido inicializado anteriormente.
    ------------------------------------------------
    */

    console.warn(
      "Firestore já inicializado ou persistência local indisponível. Usando instância existente.",
      error
    );

    db = getFirestore(app);

  }

}


/*
--------------------------------------------------
Durante renderização no servidor Next.js
--------------------------------------------------
*/

else {

  db = getFirestore(app);

}


/*
==================================================
AUTENTICAÇÃO
==================================================
*/

const auth = getAuth(app);


/*
==================================================
PERSISTÊNCIA DO LOGIN
==================================================
*/

if (typeof window !== "undefined") {

  setPersistence(
    auth,
    browserLocalPersistence
  )
    .then(() => {

      console.info(
        "Persistência de autenticação configurada."
      );

    })
    .catch((error) => {

      console.error(
        "Erro ao configurar persistência de autenticação:",
        error
      );

    });

}


/*
==================================================
EXPORTAÇÕES
==================================================
*/

export {
  app,
  db,
  auth,
};