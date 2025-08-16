
/**
 * !! ANTES DE EDITAR ESTE ARCHIVO, REVISA LAS DIRECTRICES EN LOS SIGUIENTES DOCUMENTOS: !!
 * - /README.md
 * - /src/AGENTS.md
 * 
 * Este archivo es el punto central de configuración de Firebase.
 * Un cambio incorrecto aquí puede desconectar la aplicación de la base de datos y la autenticación.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, User, sendEmailVerification } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: 'yoursub-6ed54',
  appId: '1:726328269512:web:575f70785c87e47e45e3fd',
  storageBucket: 'yoursub-6ed54.appspot.com',
  apiKey: 'AIzaSyAAi6kq1cfLYYN9L92Rq1qsz063NH2EztM',
  authDomain: 'yoursub-6ed54.firebaseapp.com',
  messagingSenderId: '726328269512',
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Function to create a user profile document in Firestore
// Modificado para aceptar referralCode y referrerId
const createUserProfile = async (
    user: User,
    options?: { referrerId?: string; referralCode?: string }
) => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    const { uid, email, displayName, photoURL } = user;
    const referralCode = options?.referralCode || uid;
    // Si options.referrerId es undefined, null o '', lo forzamos a null
    let referrerId: string | null = options?.referrerId || null;
    if (!referrerId || referrerId === "") referrerId = null;

    if (!userDoc.exists()) {
        try {
            await setDoc(userRef, {
                uid,
                email,
                displayName: displayName || email?.split('@')[0] || 'New User',
                photoURL: photoURL || `https://avatar.vercel.sh/${email}.png`,
                role: 'user',
                createdAt: serverTimestamp(),
                generatedEarnings: 0,
                paidEarnings: 0,
                accountStatus: 'active',
                customCpm: null,
                referralCode,
                referrerId,
            });
        } catch (error) {
            console.error("Error creating user profile:", error);
        }
    } else {
        // Si el usuario ya existe, aseguramos que tenga ambos campos y actualizamos referrerId si está vacío, null o undefined
        const data = userDoc.data();
        const updateFields: Record<string, any> = {};
        if ((typeof data.referrerId === 'undefined' || data.referrerId === null || data.referrerId === '') && referrerId) {
            updateFields['referrerId'] = referrerId;
        }
        if (typeof data.referralCode === 'undefined') {
            updateFields['referralCode'] = referralCode;
        }
        if (Object.keys(updateFields).length > 0) {
            try {
                await setDoc(userRef, updateFields, { merge: true });
            } catch (error) {
                console.error("Error updating user fields:", error);
            }
        }
    }
};

const getUserProfile = async (uid: string) => {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        return userDoc.data();
    }
    return null;
}

export { app, auth, db, storage, createUserProfile, getUserProfile, sendEmailVerification };
