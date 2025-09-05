
// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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
const db = getFirestore(app);
const auth = getAuth(app);

// Habilita a persistência offline.
// Isso deve ser feito apenas uma vez. O SDK do Firebase lida com isso de forma inteligente.
try {
    enableIndexedDbPersistence(db)
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                // Múltiplas abas abertas, o que pode causar problemas.
                // A persistência já deve estar habilitada.
                console.warn("A persistência do Firestore falhou em ser habilitada, talvez por múltiplas abas abertas.");
            } else if (err.code == 'unimplemented') {
                // O navegador não suporta a persistência.
                console.warn("O navegador não suporta a persistência offline do Firestore.");
            }
        });
} catch (error) {
    console.error("Erro ao inicializar a persistência do Firestore:", error);
}


export { app, db, auth };
