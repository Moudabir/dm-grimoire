import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Config provided by user for dndgrm project
const firebaseConfig = {
  apiKey: "AIzaSyBnwTEuom1mpOOi_ruQag7PQNlMR6nAndk",
  authDomain: "dndgrm.firebaseapp.com",
  projectId: "dndgrm",
  storageBucket: "dndgrm.firebasestorage.app",
  messagingSenderId: "210545617901",
  appId: "1:210545617901:web:685a81e0c1822a06e095e4",
  measurementId: "G-QW65WZTX7Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
