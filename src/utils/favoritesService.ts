import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_KEY = 'achour_favorites';

export const getLocalFavoriteIds = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

export const syncFavoritesFromFirestore = async (userId: string): Promise<string[]> => {
  if (!userId) return getLocalFavoriteIds();
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const favs = userDoc.data().favorites || [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
      return favs;
    }
  } catch (e) {
    console.warn('Failed to sync favorites from Firestore:', e);
  }
  return getLocalFavoriteIds();
};

export const toggleFavorite = async (userId: string, streamId: string, metadata?: any): Promise<boolean> => {
  const current = getLocalFavoriteIds();
  const isFav = current.includes(streamId);
  const next = isFav ? current.filter(id => id !== streamId) : [...current, streamId];
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  
  if (userId) {
    try {
      await setDoc(doc(db, 'users', userId), { 
        favorites: next,
        // If we wanted to store metadata in Firestore, we could do it here
        // but for now we follow the existing ID-only list pattern for sync efficiency
      }, { merge: true });
    } catch (e) {
      console.error('Failed to update favorites in Firestore:', e);
    }
  }
  
  return !isFav;
};

export const subscribeFavorites = (userId: string | null | undefined, callback: (ids: string[]) => void) => {
  if (!userId) {
    // Fallback to local storage polling or just initial load if no user
    const local = getLocalFavoriteIds();
    callback(local);
    return () => {};
  }
  return onSnapshot(doc(db, 'users', userId), (doc) => {
    if (doc.exists()) {
      const favs = doc.data().favorites || [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
      callback(favs);
    }
  });
};

