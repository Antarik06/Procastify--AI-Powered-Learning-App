import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getSecureKey } from "./services/secureKeyManager";

/**
 * Safely read environment variables (Vite / CRA / Node fallback)
 */
const getEnv = (key: string): string | undefined => {
    if (typeof import.meta !== "undefined" && (import.meta as any).env) {
        return (
            (import.meta as any).env[`VITE_${key}`] ||
            (import.meta as any).env[`REACT_APP_${key}`]
        );
    }

    if (typeof process !== "undefined" && process.env) {
        return process.env[`REACT_APP_${key}`] || process.env[key];
    }

    return undefined;
};

/**
 * Firebase Configuration
 */
const firebaseConfig = {
    apiKey: getSecureKey("FIREBASE_API_KEY") || getEnv("FIREBASE_API_KEY"),
    authDomain: getEnv("FIREBASE_AUTH_DOMAIN"),
    projectId: getEnv("FIREBASE_PROJECT_ID"),
    storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID"),
    appId: getEnv("FIREBASE_APP_ID"),
};

/**
 * Validate Firebase Configuration
 */
export const isFirebaseConfigured = (): boolean => {
    return !!(
        firebaseConfig.apiKey &&
        firebaseConfig.apiKey.length > 20 &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId
    );
};

/**
 * Safe Firebase Initialization
 */
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    console.log("✅ Firebase initialized successfully");

    // Optional Emulator Support
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
        const useEmulators = getEnv("USE_EMULATORS") === "true";

        if (useEmulators) {
            try {
                console.log("🔧 Connecting to Firebase Emulators...");
                connectFirestoreEmulator(db, "localhost", 8080);
                connectStorageEmulator(storage, "localhost", 9199);
                console.log("✅ Connected to Firebase Emulators");
            } catch (error: any) {
                console.warn("⚠️ Emulator connection failed:", error.message);
            }
        }
    }
} else {
    console.warn("⚠️ Firebase not configured — running in UI-only mode");
}

/**
 * Export instances (can be null if not configured)
 */
export { app, auth, db, storage };