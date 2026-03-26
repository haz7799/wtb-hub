import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // 👈 新增這行

const firebaseConfig = {
  apiKey: "AIzaSyD2MvebD58huw_FIcjFDx1nBDhPxX7zpv0",
  authDomain: "wtb-hub.firebaseapp.com",
  projectId: "wtb-hub",
  storageBucket: "wtb-hub.firebasestorage.app",
  messagingSenderId: "415378714459",
  appId: "1:415378714459:web:a5ad103218763a2540b47e",
  measurementId: "G-B6GX0MPDC5"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app); // 👈 新增這行，匯出 Storage 實例