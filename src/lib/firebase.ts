// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "music-pal-63rrp",
  appId: "1:682160842216:web:091590d1b4b7c96bc4705d",
  storageBucket: "music-pal-63rrp.firebasestorage.app",
  apiKey: "AIzaSyDKVX_Et75ezt-GlIl7uSMPNftGe3pAQe0",
  authDomain: "music-pal-63rrp.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "682160842216"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
