import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "apiKey": "AIzaSyDjwVfgminLd9uLJoRvQcM-B_947iKB9sw",
  "authDomain": "who-wins-comix.firebaseapp.com",
  "projectId": "who-wins-comix",
  "storageBucket": "who-wins-comix.firebasestorage.app",
  "messagingSenderId": "155139884250",
  "appId": "1:155139884250:web:6be4bd4f1e92ced9f451e3",
  "measurementId": "G-1JHTSBJP76"
};

export const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

