import React, { useState, useEffect } from 'react';
import { getHistory, HistoryItem, clearHistory } from '../lib/history';
import { Trash2, Download } from 'lucide-react';

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setItems(getHistory());
  }, []);

  const handleClear = () => {
    if (confirm("Are you sure you want to clear your device history?")) {
      clearHistory();
      setItems([]);
    }
  };

  return (
    <main className="flex-1 flex flex-col px-4 md:px-20 py-10 w-full overflow-y-auto">
      <div className="flex items-end justify-between mb-8 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Your History</h1>
          <p className="text-gray-500 mt-2">Specialized history tab for this device.</p>
        </div>
        {items.length > 0 && (
          <button 
            onClick={handleClear}
            className="flex items-center space-x-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p>No history found on this device.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map(item => (
            <div key={item.id} className="group border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 flex flex-col">
              <div className="aspect-square w-full relative bg-gray-100">
                {item.type === 'image' ? (
                  <img src={item.url} alt="History Item" className="w-full h-full object-cover" />
                ) : (
                  <video src={item.url} className="w-full h-full object-cover" controls />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a href={item.url} download className="bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors">
                    <Download className="w-5 h-5" />
                  </a>
                </div>
              </div>
              <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{item.source}</span>
                <span className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
