// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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

export { app, db, auth };
