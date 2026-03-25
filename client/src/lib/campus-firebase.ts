import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const campusProjectId = import.meta.env.VITE_CAMPUS_FIREBASE_PROJECT_ID;
const campusStorageBucket =
  import.meta.env.VITE_CAMPUS_FIREBASE_STORAGE_BUCKET ||
  (campusProjectId ? `${campusProjectId}.firebasestorage.app` : undefined);

const campusFirebaseConfig = {
  apiKey: import.meta.env.VITE_CAMPUS_FIREBASE_API_KEY,
  authDomain:
    import.meta.env.VITE_CAMPUS_FIREBASE_AUTH_DOMAIN ||
    (campusProjectId ? `${campusProjectId}.firebaseapp.com` : undefined),
  projectId: campusProjectId,
  storageBucket: campusStorageBucket,
  appId: import.meta.env.VITE_CAMPUS_FIREBASE_APP_ID,
};

export const isCampusFirebaseConfigured = Boolean(
  campusFirebaseConfig.apiKey &&
    campusFirebaseConfig.projectId &&
    campusFirebaseConfig.appId &&
    campusFirebaseConfig.authDomain,
);

const CAMPUS_APP_NAME = "campus-ambassador";

const campusApp = isCampusFirebaseConfigured
  ? getApps().some((app) => app.name === CAMPUS_APP_NAME)
    ? getApp(CAMPUS_APP_NAME)
    : initializeApp(campusFirebaseConfig, CAMPUS_APP_NAME)
  : null;

function createCampusFirestore() {
  if (!campusApp) return null;
  try {
    return initializeFirestore(campusApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    console.warn("Campus Firestore falling back to memory cache:", error);
    return initializeFirestore(campusApp, {
      localCache: memoryLocalCache(),
    });
  }
}

export const campusAuth = campusApp ? getAuth(campusApp) : null;
export const campusDb = createCampusFirestore();
export const campusStorage = campusApp ? getStorage(campusApp) : null;
export const campusGoogleProvider = new GoogleAuthProvider();

campusGoogleProvider.setCustomParameters({
  prompt: "select_account consent",
  access_type: "offline",
  include_granted_scopes: "true",
  hd: "",
});
