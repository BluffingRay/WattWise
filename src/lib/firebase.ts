import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// 1. IMPORT AUTHENTICATION MODULES
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your full, official Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDydTquxkklqMw2UEOoVgunYwynVNxG1sY",
  authDomain: "wattwise-4ebde.firebaseapp.com",
  
  // CRITICAL for your ESP32 connection: Do not delete this line!
  databaseURL: "https://wattwise-4ebde-default-rtdb.asia-southeast1.firebasedatabase.app/",
  
  projectId: "wattwise-4ebde",
  storageBucket: "wattwise-4ebde.firebasestorage.app",
  messagingSenderId: "353593107609",
  appId: "1:353593107609:web:2394f364ca212d49de8408",
  measurementId: "G-EF3WYQT6XF"
};

// Safe Next.js Initialization (Prevents hot-reload crashes)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Connect to Realtime Database
const database = getDatabase(app);

// 2. INITIALIZE AUTHENTICATION AND GOOGLE PROVIDER
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Safe Analytics Initialization (Prevents server-side crashes)
let analytics;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// 3. EXPORT THE NEW AUTH VARIABLES
export { app, database, analytics, auth, googleProvider };