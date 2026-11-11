
const STORAGE_KEY = 'achour_recents';
const MAX_RECENTS = 50;

export const getRecents = (): any[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

export const addToRecents = (item: any) => {
  if (!item || !item.stream_id) return;
  const current = getRecents();
  const filtered = current.filter(i => i.stream_id !== item.stream_id);
  const next = [item, ...filtered].slice(0, MAX_RECENTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
