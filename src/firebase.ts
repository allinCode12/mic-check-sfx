import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDpeoikW0p7cXW2vk2B9lr8f9RhnuucFOo",
  authDomain: "sfxsoundboard.firebaseapp.com",
  databaseURL: "https://sfxsoundboard-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sfxsoundboard",
  storageBucket: "sfxsoundboard.firebasestorage.app",
  messagingSenderId: "741530331338",
  appId: "1:741530331338:web:43017b8613afeddc31ac33"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
export default app;
