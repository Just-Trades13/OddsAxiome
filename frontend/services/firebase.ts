import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAdRAGhL6ygycj_GY45CTKpVcGRwl3ejMQ",
  authDomain: "odds-axiom.firebaseapp.com",
  projectId: "odds-axiom",
  storageBucket: "odds-axiom.firebasestorage.app",
  messagingSenderId: "64993675320",
  appId: "1:64993675320:web:f693431721a84354d8fecd",
  measurementId: "G-CNVJBHQNDH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;