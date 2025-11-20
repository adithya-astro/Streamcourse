import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
  // Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJpDwWRMcT6TpHcnCEfWU49Y_i1sVat9Q",
    authDomain: "stream-c2a0a.firebaseapp.com",
    projectId: "stream-c2a0a",
    storageBucket: "stream-c2a0a.firebasestorage.app",
    messagingSenderId: "439251865646",
    appId: "1:439251865646:web:01d8109e838c7ca0698fbf",
    measurementId: "G-LTJVG02RCR"
};
 // Initialize Firebase
const app = initializeApp(firebaseConfig);
 // Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);                                                                           
export { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
};