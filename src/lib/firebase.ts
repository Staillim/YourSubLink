
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: "yoursub-6ed54",
  appId: "1:726328269512:web:575f70785c87e47e45e3fd",
  storageBucket: "yoursub-6ed54.firebasestorage.app",
  apiKey: "AIzaSyAAi6kq1cfLYYN9L92Rq1qsz063NH2EztM",
  authDomain: "yoursub-6ed54.firebaseapp.com",
  messagingSenderId: "726328269512",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
