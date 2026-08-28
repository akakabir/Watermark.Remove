export interface HistoryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  source: 'remover' | 'creator' | 'adder';
  createdAt: number;
}

export const getHistory = (): HistoryItem[] => {
  try {
    const stored = localStorage.getItem('wm_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'createdAt'>) => {
  const newItem: HistoryItem = {
    ...item,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: Date.now()
  };
  const history = [newItem, ...getHistory()];
  localStorage.setItem('wm_history', JSON.stringify(history));
  return newItem;
};

export const clearHistory = () => {
  localStorage.removeItem('wm_history');
};
