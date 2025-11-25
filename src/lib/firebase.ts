// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDKVX_Et75ezt-GlIl7uSMPNftGe3pAQe0",
  authDomain: "music-pal-63rrp.firebaseapp.com",
  projectId: "music-pal-63rrp",
  storageBucket: "music-pal-63rrp.firebasestorage.app",
  messagingSenderId: "682160842216",
  appId: "1:682160842216:web:f5329c818ff76a7ac4705d"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Ativa a persistência offline do Firestore e a persistência de login local
if (typeof window !== 'undefined') {
  // Configura a persistência de autenticação para manter o usuário logado
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("Persistência de autenticação configurada.");
    })
    .catch((error) => {
      console.error("Erro ao configurar a persistência de autenticação:", error);
    });

  // Ativa a persistência de dados do Firestore para uso offline
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('Firebase: A persistência do Firestore falhou porque múltiplas abas estão abertas.');
      } else if (err.code == 'unimplemented') {
        console.warn('Firebase: O navegador não suporta a persistência offline do Firestore.');
      }
    });
}

export { app, db, auth };
