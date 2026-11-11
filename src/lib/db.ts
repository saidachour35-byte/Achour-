import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'AchourPlayerDB';
const DB_VERSION = 4;

export const initDB = async (): Promise<IDBPDatabase<any>> => {
  try {
    return await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 4) {
          // Clean start if needed or specific migrations
          if (!db.objectStoreNames.contains('channels')) {
            const store = db.createObjectStore('channels', { keyPath: 'id' });
            store.createIndex('category_id', 'category_id');
            store.createIndex('type', 'type');
            store.createIndex('playlist_id', 'playlist_id');
            store.createIndex('playlist_type', ['playlist_id', 'type']);
            store.createIndex('stream_id', 'stream_id');
          }
          if (!db.objectStoreNames.contains('categories')) {
            const store = db.createObjectStore('categories', { keyPath: 'id' });
            store.createIndex('type', 'type');
            store.createIndex('playlist_id', 'playlist_id');
            store.createIndex('playlist_type', ['playlist_id', 'type']);
          }
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('episodes')) {
            const store = db.createObjectStore('episodes', { keyPath: 'id' });
            store.createIndex('series_id', 'series_id');
            store.createIndex('playlist_id', 'playlist_id');
            store.createIndex('playlist_series', ['playlist_id', 'series_id']);
          }
        }
      },
    });
  } catch (err) {
    console.warn('DB init error, attempting recovery:', err);
    try {
      indexedDB.deleteDatabase(DB_NAME);
    } catch (e) {}
    return openDB(DB_NAME, 1, {
      upgrade(db) {
        const cStore = db.createObjectStore('channels', { keyPath: 'id' });
        cStore.createIndex('playlist_type', ['playlist_id', 'type']);
        cStore.createIndex('type', 'type');
        cStore.createIndex('playlist_id', 'playlist_id');
        
        const catStore = db.createObjectStore('categories', { keyPath: 'id' });
        catStore.createIndex('playlist_type', ['playlist_id', 'type']);
        
        db.createObjectStore('metadata', { keyPath: 'id' });
        
        const epStore = db.createObjectStore('episodes', { keyPath: 'id' });
        epStore.createIndex('playlist_series', ['playlist_id', 'series_id']);
      },
    });
  }
};

// Extraction Status Helpers
export const getPlaylistExtractionStatus = async (playlistId: string) => {
  try {
    const db = await initDB();
    return await db.get('metadata', `extraction_${playlistId}`);
  } catch (e) {
    return null;
  }
};

export const setPlaylistExtractionStatus = async (playlistId: string, status: any) => {
  try {
    const db = await initDB();
    await db.put('metadata', {
      id: `extraction_${playlistId}`,
      ...status,
      updatedAt: Date.now()
    });
  } catch (e) {
    console.error('Error saving extraction status:', e);
  }
};

export const saveChannels = async (channels: any[], type: 'live' | 'movie' | 'series', playlistId: string) => {
  if (!channels || channels.length === 0) return;
  try {
    const db = await initDB();
    const BATCH_SIZE = 5000;
    
    for (let i = 0; i < channels.length; i += BATCH_SIZE) {
      const batch = channels.slice(i, i + BATCH_SIZE);
      const tx = db.transaction('channels', 'readwrite');
      const store = tx.objectStore('channels');
      
      const promises = batch.map(ch => {
        const rawStreamId = String(ch.stream_id || ch.id || Math.random().toString(36).substring(2, 9));
        return store.put({
          ...ch,
          id: `${playlistId}_${type}_${rawStreamId}`,
          stream_id: rawStreamId,
          playlist_id: playlistId,
          type: type
        });
      });
      
      await Promise.all([...promises, tx.done]);
    }
  } catch (e) {
    console.error('Error in saveChannels:', e);
    throw e;
  }
};

export const saveCategories = async (categories: any[], type: 'live' | 'movie' | 'series', playlistId: string) => {
  if (!categories || categories.length === 0) return;
  try {
    const db = await initDB();
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');
    
    for (const cat of categories) {
      const catId = String(cat.category_id || cat.id || cat.category_name || Math.random().toString(36).substring(2, 9));
      store.put({
        ...cat,
        id: `${playlistId}_${type}_${catId}`,
        category_id: catId,
        playlist_id: playlistId,
        type
      });
    }
    await tx.done;
  } catch (e) {
    console.error('Error in saveCategories:', e);
    throw e;
  }
};

export const getChannelsByPlaylistAndType = async (playlistId: string, type: 'live' | 'movie' | 'series' | 'favorites') => {
  const effectiveType = type === 'favorites' ? 'live' : type;
  try {
    const db = await initDB();
    const index = db.transaction('channels', 'readonly').objectStore('channels').index('playlist_type');
    let items = await index.getAll([playlistId, effectiveType]);
    
    // Fallback: If no items found for this playlistId, return all channels for this type in DB
    if (!items || items.length === 0) {
      const typeIndex = db.transaction('channels', 'readonly').objectStore('channels').index('type');
      items = await typeIndex.getAll(effectiveType);
    }
    return items || [];
  } catch (e) {
    console.error('Error in getChannelsByPlaylistAndType:', e);
    return [];
  }
};

export const getCategoriesByPlaylistAndType = async (playlistId: string, type: 'live' | 'movie' | 'series') => {
  try {
    const db = await initDB();
    const index = db.transaction('categories', 'readonly').objectStore('categories').index('playlist_type');
    let items = await index.getAll([playlistId, type]);
    
    // Fallback: If no categories found for this playlistId, return all categories for this type in DB
    if (!items || items.length === 0) {
      const typeIndex = db.transaction('categories', 'readonly').objectStore('categories').index('type');
      items = await typeIndex.getAll(type);
    }
    return items || [];
  } catch (e) {
    console.error('Error in getCategoriesByPlaylistAndType:', e);
    return [];
  }
};

export const getChannelsByCategory = async (type: string, categoryId: string, playlistId?: string) => {
  try {
    const db = await initDB();
    const effectiveType = (type === 'favorites' ? 'live' : type) as 'live' | 'movie' | 'series';

    // Handle "All Categories" case
    if (!categoryId || categoryId === 'ALL_CATEGORIES' || categoryId === 'all' || categoryId === 'ALL') {
      if (playlistId) {
        const list = await getChannelsByPlaylistAndType(playlistId, effectiveType);
        if (list && list.length > 0) return list;
      }
      return await getChannelsByType(effectiveType);
    }

    const tx = db.transaction('channels', 'readonly').objectStore('channels');
    const index = tx.index('category_id');

    // 1. Primary lookup by category_id index (string or number)
    let items = await index.getAll(String(categoryId));
    if ((!items || items.length === 0) && !isNaN(Number(categoryId))) {
      items = await index.getAll(Number(categoryId));
    }

    // Filter items by type and playlistId if matches exist
    if (items && items.length > 0) {
      let filtered = items.filter(c => (!effectiveType || c.type === effectiveType));
      if (playlistId) {
        const playlistFiltered = filtered.filter(c => !c.playlist_id || c.playlist_id === playlistId);
        if (playlistFiltered.length > 0) filtered = playlistFiltered;
      }
      if (filtered.length > 0) return filtered;
    }

    // 2. Comprehensive fallback: retrieve all channels for effectiveType
    let allChannels: any[] = [];
    if (playlistId) {
      allChannels = await getChannelsByPlaylistAndType(playlistId, effectiveType);
    }
    if (!allChannels || allChannels.length === 0) {
      allChannels = await getChannelsByType(effectiveType);
    }

    if (allChannels && allChannels.length > 0) {
      const cleanCatId = String(categoryId).trim().toLowerCase();
      
      // Match by category_id, category_name, category, or group
      const matched = allChannels.filter(c => {
        const cid = String(c.category_id || '').trim().toLowerCase();
        const cname = String(c.category_name || c.category || c.group || '').trim().toLowerCase();
        return (
          cid === cleanCatId ||
          cname === cleanCatId ||
          (cleanCatId && cname && (cname.includes(cleanCatId) || cleanCatId.includes(cname)))
        );
      });

      if (matched.length > 0) return matched;

      // If categoryId was a category_name in categories store, find the category object to get its numeric category_id
      const categories = await getCategoriesByType(effectiveType);
      const targetCat = categories.find(cat => 
        String(cat.category_name || cat.name || '').trim().toLowerCase() === cleanCatId ||
        String(cat.category_id || cat.id || '').trim().toLowerCase() === cleanCatId
      );

      if (targetCat) {
        const catNumericId = String(targetCat.category_id || targetCat.id || '').trim().toLowerCase();
        const catNameStr = String(targetCat.category_name || targetCat.name || '').trim().toLowerCase();
        
        const catMatched = allChannels.filter(c => {
          const cid = String(c.category_id || '').trim().toLowerCase();
          const cname = String(c.category_name || c.category || c.group || '').trim().toLowerCase();
          return cid === catNumericId || cname === catNameStr;
        });

        if (catMatched.length > 0) return catMatched;
      }
    }

    return [];
  } catch (e) {
    console.error('Error in getChannelsByCategory:', e);
    return [];
  }
};

export const getChannelsByType = async (type: 'live' | 'movie' | 'series' | 'favorites') => {
  try {
    const db = await initDB();
    const index = db.transaction('channels', 'readonly').objectStore('channels').index('type');
    const effectiveType = type === 'favorites' ? 'live' : type;
    return await index.getAll(effectiveType);
  } catch (e) {
    return [];
  }
};

export const getCategoriesByType = async (type: 'live' | 'movie' | 'series') => {
  try {
    const db = await initDB();
    const index = db.transaction('categories', 'readonly').objectStore('categories').index('type');
    return await index.getAll(type);
  } catch (e) {
    return [];
  }
};

export const saveEpisodes = async (playlistId: string, seriesId: string, episodes: any[]) => {
  if (!episodes || episodes.length === 0 || !seriesId) return;
  try {
    const db = await initDB();
    const tx = db.transaction('episodes', 'readwrite');
    const store = tx.objectStore('episodes');
    for (const ep of episodes) {
      const epId = String(ep.id || ep.stream_id || Math.random().toString(36).substring(2, 9));
      store.put({
        ...ep,
        id: `${playlistId}_${seriesId}_${epId}`,
        series_id: String(seriesId),
        playlist_id: playlistId
      });
    }
    await tx.done;
  } catch (e) {
    console.error('Error in saveEpisodes:', e);
  }
};

export const getEpisodesBySeriesId = async (playlistId: string, seriesId: string) => {
  if (!seriesId || !playlistId) return [];
  try {
    const db = await initDB();
    const index = db.transaction('episodes', 'readonly').objectStore('episodes').index('playlist_series');
    return await index.getAll([playlistId, String(seriesId)]);
  } catch (e) {
    console.error('Error in getEpisodesBySeriesId:', e);
    return [];
  }
};

export const clearPlaylistData = async (playlistId: string) => {
  try {
    const db = await initDB();
    const range = IDBKeyRange.bound(`${playlistId}_`, `${playlistId}_\uffff`);
    const tx = db.transaction(['channels', 'categories', 'episodes', 'metadata'], 'readwrite');
    
    await tx.objectStore('channels').delete(range);
    await tx.objectStore('categories').delete(range);
    await tx.objectStore('episodes').delete(range);
    await tx.objectStore('metadata').delete(`extraction_${playlistId}`);
    
    await tx.done;
  } catch (e) {
    console.error('Error clearing playlist data:', e);
  }
};

export const clearDB = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction(['channels', 'categories', 'episodes', 'metadata'], 'readwrite');
    await tx.objectStore('channels').clear();
    await tx.objectStore('categories').clear();
    await tx.objectStore('episodes').clear();
    await tx.objectStore('metadata').clear();
    await tx.done;
  } catch (e) {}
};

