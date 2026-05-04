// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD39aiKBXplrKwbmXa1ni5XEnw6seNZHC4",
  authDomain: "social-media-app-2684b.firebaseapp.com",
  projectId: "social-media-app-2684b",
  storageBucket: "social-media-app-2684b.firebasestorage.app",
  messagingSenderId: "480875423405",
  appId: "1:480875423405:web:8e47812d938c907e93c824"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);