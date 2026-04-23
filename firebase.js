// IMPORTS (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  doc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBuo3xBXgQ51GUyKWSkIFmNk9bDvhEZkPM",
  authDomain: "sinuca-19890.firebaseapp.com",
  projectId: "sinuca-19890",
  storageBucket: "sinuca-19890.firebasestorage.app",
  messagingSenderId: "504529248919",
  appId: "1:504529248919:web:495389d59828c9b1f53fd2"
};

// INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// EXPORT
export { db, collection, addDoc, onSnapshot, updateDoc, doc, auth };