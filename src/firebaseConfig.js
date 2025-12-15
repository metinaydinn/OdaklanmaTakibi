import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // <--- YENİ EKLENDİ
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // SENİN MEVCUT AYARLARIN BURADA KALSIN (apiKey vs.)
  apiKey: "AIzaSyC3Sm3DrvlsJS2yv_P1l0_wOoARP8IOGoE",
  authDomain: "odaklanmatakibi.firebaseapp.com",
  projectId: "odaklanmatakibi",
  storageBucket: "odaklanmatakibi.firebasestorage.app",
  messagingSenderId: "66382187796",
  appId: "1:66382187796:web:969d7d269987b584a60601",
  measurementId: "G-8QDBW11BKS"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // <--- YENİ EKLENDİ (Dışarı aktarıyoruz)