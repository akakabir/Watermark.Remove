import React, { useState } from 'react';
import { addHistoryItem } from '../lib/history';
import { Loader2, Sparkles, Image as ImageIcon, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Creator() {
  const [prompt, setPrompt] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');

    try {
      // Mock API call to backend
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: mediaType })
      });
      const data = await res.json();

      if (data.success) {
        addHistoryItem({
          url: data.url,
          type: data.type,
          source: 'creator'
        });
        navigate('/history');
      } else {
        setError(data.error || 'Failed to generate');
      }
    } catch (err) {
      setError('An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-10 shadow-sm text-center">
        <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center shadow-sm mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-white" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-bold mb-2">Video & Image Creator</h1>
        <p className="text-gray-500 mb-8">Generate media without watermarks using text prompts.</p>

        <form onSubmit={handleGenerate} className="space-y-6 text-left">
          <div className="flex w-full p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setMediaType('image')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg text-sm font-semibold transition-all ${mediaType === 'image' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Image</span>
            </button>
            <button
              type="button"
              onClick={() => setMediaType('video')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg text-sm font-semibold transition-all ${mediaType === 'video' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
            >
              <Video className="w-4 h-4" />
              <span>Video</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Describe what you want to create</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`e.g. A futuristic city skyline at sunset in cinematic 4K ${mediaType === 'video' ? 'video' : 'style'}...`}
              className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-black transition-colors min-h-[120px] resize-none"
              disabled={isGenerating}
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-black text-white rounded-xl py-4 font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <span>Create Media</span>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
