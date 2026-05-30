
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgnAkBiYzbXc2lwCO4ZILkEIMmV7NmlNg",
  authDomain: "ays2026.firebaseapp.com",
  projectId: "ays2026",
  storageBucket: "ays2026.firebasestorage.app",
  messagingSenderId: "776704252344",
  appId: "1:776704252344:web:a81ed6f18d8fbd862dd74d",
  measurementId: "G-3DZ9JGJVVM",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
