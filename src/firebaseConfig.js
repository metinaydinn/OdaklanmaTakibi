import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// Auth kütüphanelerini ekliyoruz
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";

// SENİN AYARLARIN
const firebaseConfig = {
  apiKey: "AIzaSyC3Sm3DrvlsJS2yv_P1l0_wOoARP8IOGoE",
  authDomain: "odaklanmatakibi.firebaseapp.com",
  projectId: "odaklanmatakibi",
  storageBucket: "odaklanmatakibi.firebasestorage.app",
  messagingSenderId: "66382187796",
  appId: "1:66382187796:web:969d7d269987b584a60601",
  measurementId: "G-8QDBW11BKS"
};

let app;
let auth;

try {
  // 1. Uygulama Kontrolü
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // 2. Auth Başlatma (AsyncStorage ile)
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (e) {
    // Eğer zaten başlatılmışsa var olanı al
    auth = getAuth(app);
  }

} catch (e) {
  console.error("Firebase Başlatma Hatası:", e);
}

const db = getFirestore(app);

// AUTH VE DB DIŞARI AKTARILIYOR
export { auth, db };
