import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager 
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling to ensure reliable connectivity inside iframe sandboxes
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  },
  firebaseConfig.firestoreDatabaseId
);


export const auth = getAuth(app);

// Connection test as required by skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore operating in offline cache mode. Please check Firebase configuration.");
    }
  }
}
testConnection();



export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively removes any keys with `undefined` values from an object or array before sending to Firestore.
 * Firestore throws a runtime error if any property in a payload is `undefined`.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }

  return data;
}

/**
 * Gets or creates a persistent local ID for the user.
 * This ensures the app is "open for everyone" even before sign-in.
 */
export const getPublicId = (): string => {
  try {
    let id = localStorage.getItem('achour_player_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('achour_player_user_id', id);
    }
    return id;
  } catch (e) {
    return 'user_guest_' + Math.floor(Math.random() * 1000000);
  }
};

