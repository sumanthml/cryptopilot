import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAXiiiX6LFnPIdxtmVuO4sNFynk5DUd-no',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cryptopilot-76208.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cryptopilot-76208',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cryptopilot-76208.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '586639749602',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:586639749602:web:b878580cc526552ea709bb',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
