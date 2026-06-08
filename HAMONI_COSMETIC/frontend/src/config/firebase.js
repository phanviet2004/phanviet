// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// Thay thế cục config này bằng thông tin dự án của bạn trên Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyClOnTdXyMGHgPbzKVbRC1sp5Qy2GBGVhA",
  authDomain: "hamoni-cosmetic.firebaseapp.com",
  projectId: "hamoni-cosmetic",
  storageBucket: "hamoni-cosmetic.firebasestorage.app",
  messagingSenderId: "454408535602",
  appId: "1:454408535602:web:8999d92ca8bfdb2b21c62b"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo dịch vụ Storage để lưu ảnh và xuất ra dùng ở nơi khác
export const storage = getStorage(app);