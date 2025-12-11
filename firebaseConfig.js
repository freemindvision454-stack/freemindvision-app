import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBB_A2BURQ1jNnZ9atmFz4LLAupJwxQZLI",
  authDomain: "freemind-app-e9d0e.firebaseapp.com",
  projectId: "freemind-app-e9d0e",
  storageBucket: "freemind-app-e9d0e.firebasestorage.app",
  messagingSenderId: "960645940778",
  appId: "1:960645940778:web:676943dd03bcdaed6ca553",
  measurementId: "G-2R5N3EQE15"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
