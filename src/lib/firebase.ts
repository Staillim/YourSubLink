
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
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
const createUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        const { uid, email, displayName, photoURL } = user;
        try {
            await setDoc(userRef, {
                uid,
                email,
                displayName: displayName || email?.split('@')[0] || 'New User',
                photoURL: photoURL || `https://avatar.vercel.sh/${email}.png`,
                role: email === 'harrigta@gmail.com' ? 'admin' : 'user',
                createdAt: new Date(),
            });
        } catch (error) {
            console.error("Error creating user profile:", error);
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

export { app, auth, db, storage, createUserProfile, getUserProfile };
