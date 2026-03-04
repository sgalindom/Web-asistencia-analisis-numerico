
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForDevelopment",
  authDomain: "asistencias-uts.firebaseapp.com",
  projectId: "asistencias-uts",
  storageBucket: "asistencias-uts.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:dummyid"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
