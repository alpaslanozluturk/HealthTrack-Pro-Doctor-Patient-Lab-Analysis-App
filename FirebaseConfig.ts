// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore} from "firebase/firestore";

const firebaseConfig = {
  apiKey: ".",
  authDomain: ".",
  projectId: ".",
  storageBucket: ".",
  messagingSenderId: ".",
  appId: ".",
  measurementId: "."
};

// Initialize Firebase
export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
export const FIRESTORE_DB = getAuth(FIREBASE_APP);
const analytics = getAnalytics(FIREBASE_APP);