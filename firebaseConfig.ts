import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getSecureKey } from "./services/secureKeyManager";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";


const getEnv = (key: string) => {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        return (import.meta as any).env[`VITE_${key}`] || (import.meta as any).env[`REACT_APP_${key}`];
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[`REACT_APP_${key}`] || process.env[key];
    }
    return undefined;
};


const firebaseConfig = {
    apiKey: getSecureKey('FIREBASE_API_KEY') || getEnv('FIREBASE_API_KEY'),
    authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('FIREBASE_APP_ID')
};

// Check if Firebase is properly configured
export const isFirebaseConfigured = (): boolean => {
    return !!(
        firebaseConfig.apiKey &&
        firebaseConfig.apiKey !== 'AIzaSy_DUMMY_KEY_FOR_DEV_MODE' &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId &&
        firebaseConfig.apiKey.length > 20 // Basic validation
    );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.error('Failed to initialize Firebase:', error);
    }
} else {
    console.warn("Firebase Configuration Missing or Invalid!");
    console.warn("Please create a .env.local file with your Firebase configuration.");
    console.warn("See SETUP.md for instructions.");
}

export { app, auth, db };
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to Firebase Emulators in development (optional)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    try {
        // Check if we should use emulators (set USE_EMULATORS=true in .env to enable)
        const useEmulators = getEnv('USE_EMULATORS') === 'true';
        
        if (useEmulators) {
            console.log('🔧 Connecting to Firebase Emulators...');
            connectFirestoreEmulator(db, 'localhost', 8080);
            connectStorageEmulator(storage, 'localhost', 9199);
            console.log('✅ Connected to Firebase Emulators (Firestore: 8080, Storage: 9199)');
        } else {
            console.log('📡 Using Production Firebase (set USE_EMULATORS=true in .env to use emulators)');
        }
    } catch (error: any) {
        // Silently fail if emulators are not running - use production instead
        console.warn('⚠️ Could not connect to emulators, using production Firebase:', error.message);
    }
}
