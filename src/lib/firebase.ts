
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBodlDhq39az1rPLNdTwdQmlEMqs4dd7v0",
  authDomain: "studio-2541071716-1dd28.firebaseapp.com",
  projectId: "studio-2541071716-1dd28",
  storageBucket: "studio-2541071716-1dd28.firebasestorage.app",
  messagingSenderId: "485342175627",
  appId: "1:485342175627:web:6337cee02e4f7bb4b7cf8e",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
