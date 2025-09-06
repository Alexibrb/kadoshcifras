
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

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with offline persistence
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn(
      'Firestore persistence failed to enable. This is likely due to multiple ' +
      'tabs being open. Offline functionality will be limited.'
    );
  } else if (err.code == 'unimplemented') {
    console.warn(
      'The current browser does not support all of ahe features required to ' +
      'enable Firestore persistence.'
    );
  }
});


const auth = getAuth(app);


export { app, db, auth };
