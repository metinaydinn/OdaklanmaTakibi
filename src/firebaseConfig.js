import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // <-- BU EKSİKTİ

// Senin bilgilerin:
const firebaseConfig = {
  apiKey: "AIzaSyC3Sm3DrvlsJS2yv_P1l0_wOoARP8IOGoE",
  authDomain: "odaklanmatakibi.firebaseapp.com",
  projectId: "odaklanmatakibi",
  storageBucket: "odaklanmatakibi.firebasestorage.app",
  messagingSenderId: "66382187796",
  appId: "1:66382187796:web:969d7d269987b584a60601",
  measurementId: "G-8QDBW11BKS"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Veritabanını başlat ve dışarı aktar (HomeScreen bunu kullanacak)
export const db = getFirestore(app); // <-- EN ÖNEMLİ KISIM BURASI