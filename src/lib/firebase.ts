// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDKVX_Et75ezt-GlIl7uSMPNftGe3pAQe0",
  authDomain: "music-pal-63rrp.firebaseapp.com",
  projectId: "music-pal-63rrp",
  storageBucket: "music-pal-63rrp.firebasestorage.app",
  messagingSenderId: "682160842216",
  appId: "1:682160842216:web:f5329c818ff76a7ac4705d"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);

// O Firestore é inicializado de forma assíncrona para habilitar o cache.
// Esta é a forma recomendada de garantir que a persistência esteja ativa.
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
  .then(() => console.log('Persistência do Firestore habilitada.'))
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Persistência do Firestore falhou: múltiplas abas abertas.');
    } else if (err.code == 'unimplemented') {
      console.log('Persistência do Firestore não disponível neste navegador.');
    }
  });
}


export { app, db, auth };
