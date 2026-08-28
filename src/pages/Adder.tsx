import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { getHistory, addHistoryItem, HistoryItem } from '../lib/history';
import { UploadCloud, Image as ImageIcon, Type, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Adder() {
  const [baseMedia, setBaseMedia] = useState<string | null>(null);
  const [watermarkType, setWatermarkType] = useState<'text' | 'image' | null>(null);
  const [watermarkText, setWatermarkText] = useState('My Watermark');
  const [watermarkImg, setWatermarkImg] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setHistoryItems(getHistory());
  }, []);

  const handleBaseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBaseMedia(URL.createObjectURL(file));
    }
  };

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWatermarkImg(URL.createObjectURL(file));
      setWatermarkType('image');
    }
  };

  const handleSave = () => {
    if (!baseMedia) return;
    // In a real app we'd draw this to a canvas. For now, just save the base image representation.
    addHistoryItem({
      url: baseMedia,
      type: 'image',
      source: 'adder'
    });
    navigate('/history');
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 overflow-y-auto">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Watermark Adder</h1>
          <p className="text-gray-500">Add a custom text or image watermark to your media.</p>
        </div>

        {!baseMedia ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border-2 border-dashed border-gray-300 rounded-[32px] p-12 flex flex-col items-center justify-center text-center bg-white hover:border-black transition-colors">
              <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="font-semibold mb-2">Upload Base Media</h3>
              <p className="text-xs text-gray-400 mb-6">Choose an image or video to watermark</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Browse Files
              </button>
              <input type="file" ref={fileInputRef} onChange={handleBaseUpload} className="hidden" accept="image/*,video/*" />
            </div>
            
            <div className="border border-gray-200 rounded-[32px] p-8 bg-white flex flex-col">
              <h3 className="font-semibold mb-4">Or choose from History</h3>
              <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[300px]">
                {historyItems.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => setBaseMedia(item.url)}
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-transparent hover:border-black transition-colors"
                  >
                    {item.type === 'image' ? (
                      <img src={item.url} className="w-full h-full object-cover" />
                    ) : (
                      <video src={item.url} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
                {historyItems.length === 0 && <p className="text-xs text-gray-400 col-span-3 text-center py-10">No history found.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 border border-gray-200 bg-white rounded-3xl overflow-hidden relative min-h-[500px] flex items-center justify-center">
              <img src={baseMedia} alt="Base" className="max-w-full max-h-[70vh] object-contain pointer-events-none" />
              
              {watermarkType === 'text' && (
                <motion.div 
                  drag 
                  dragMomentum={false}
                  className="absolute cursor-move border-2 border-dashed border-gray-400 p-2 hover:border-black transition-colors bg-white/20 backdrop-blur-sm rounded"
                >
                  <span style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily, color: 'rgba(0,0,0,0.8)', fontWeight: 'bold' }}>
                    {watermarkText}
                  </span>
                </motion.div>
              )}
              
              {watermarkType === 'image' && watermarkImg && (
                <motion.div 
                  drag 
                  dragMomentum={false}
                  className="absolute cursor-move border-2 border-dashed border-gray-400 p-2 hover:border-black transition-colors"
                >
                  <img src={watermarkImg} alt="Watermark" className="max-w-[200px] opacity-80" />
                </motion.div>
              )}
            </div>
            
            <div className="w-full lg:w-80 bg-white border border-gray-200 rounded-3xl p-6 flex flex-col space-y-6">
              <h3 className="font-bold">Watermark Settings</h3>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setWatermarkType('text')}
                  className={`flex-1 flex flex-col items-center p-3 rounded-xl border transition-colors ${watermarkType === 'text' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-black'}`}
                >
                  <Type className="w-5 h-5 mb-1" />
                  <span className="text-xs font-semibold">Text</span>
                </button>
                <button 
                  onClick={() => watermarkInputRef.current?.click()}
                  className={`flex-1 flex flex-col items-center p-3 rounded-xl border transition-colors ${watermarkType === 'image' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-black'}`}
                >
                  <ImageIcon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-semibold">Image</span>
                </button>
                <input type="file" ref={watermarkInputRef} onChange={handleWatermarkUpload} className="hidden" accept="image/*" />
              </div>

              {watermarkType === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Text</label>
                    <input 
                      type="text" 
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-black outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Font Size ({fontSize}px)</label>
                    <input 
                      type="range" 
                      min="12" max="120" 
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full accent-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Font Family</label>
                    <select 
                      value={fontFamily} 
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-black outline-none"
                    >
                      <option value="sans-serif">Sans Serif</option>
                      <option value="serif">Serif</option>
                      <option value="monospace">Monospace</option>
                      <option value="Impact">Impact</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div className="pt-4 mt-auto border-t border-gray-100 space-y-3">
                <button 
                  onClick={handleSave}
                  className="w-full bg-black text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex justify-center items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save to History</span>
                </button>
                <button 
                  onClick={() => setBaseMedia(null)}
                  className="w-full bg-white text-gray-500 border border-gray-200 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:text-black transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
