
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: "yoursublink",
  appId: "1:219482266117:web:7850b9d8736170264bda6c",
  storageBucket: "yoursublink.firebasestorage.app",
  apiKey: "AIzaSyAszhUZs1R3-g0BSddxvTn_OPMUrxHzCR8",
  authDomain: "yoursublink.firebaseapp.com",
  messagingSenderId: "219482266117",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
