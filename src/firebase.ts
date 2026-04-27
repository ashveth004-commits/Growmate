import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Test Connection with a small delay to allow network to settle
async function testConnection() {
  setTimeout(async () => {
    try {
      // Only try to connect if we have a config
      if (firebaseConfig.projectId) {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log('Firestore connection verified');
      }
    } catch (error) {
      console.warn('Firestore connectivity warning:', error);
      if(error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
        console.error("Please check your Firebase configuration or network. Firestore is currently unreachable.");
      }
    }
  }, 2000);
}

testConnection();

let storageInstance: FirebaseStorage | null = null;
try {
  if (firebaseConfig.storageBucket) {
    storageInstance = getStorage(app);
    console.log('Firebase Storage initialized with bucket:', firebaseConfig.storageBucket);
  }
} catch (error) {
  console.error('Firebase Storage initialization failed:', error);
}

export const storage = storageInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default app;
