import { cn } from '../lib/utils';
import { UploadCloud, CheckCircle2, Zap, Shield, Link as LinkIcon, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { addHistoryItem } from '../lib/history';
import { useNavigate } from 'react-router-dom';

type UploadState = 'idle' | 'processing' | 'result';

export default function Home() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Handle paste events globally
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (uploadState !== 'idle') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleFileSelect(file);
          }
          break;
        }
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [uploadState]);

  const simulateProcessing = (imageUrl: string) => {
    setMediaPreview(imageUrl);
    setUploadState('processing');
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadState('result');
          addHistoryItem({ url: imageUrl, type: 'image', source: 'remover' });
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert('File too large. Maximum size is 50MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    simulateProcessing(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      handleFileSelect(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    try {
      new URL(urlInput);
      simulateProcessing(urlInput); // In a real app we'd fetch or show the URL directly
    } catch {
      alert('Please enter a valid URL');
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-20 py-10 w-full overflow-y-auto">
      <div className="text-center space-y-4 max-w-2xl mb-12">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          Remove Watermarks <span className="text-gray-300 italic">Instantly.</span>
        </h1>
        <p className="text-lg text-gray-500">
          Upload your image or video and remove watermarks in seconds. Powered by industry-leading AI for pixel-perfect results.
        </p>
      </div>

      {uploadState === 'idle' && (
        <div className="w-full max-w-3xl relative mb-12">
          <div className="absolute -top-4 -left-4 w-24 h-24 border-t-2 border-l-2 border-gray-100 rounded-tl-3xl -z-10"></div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-2 border-r-2 border-gray-100 rounded-br-3xl -z-10"></div>
          
          <div 
            className={cn(
              "border-2 border-dashed rounded-[32px] p-8 md:p-16 flex flex-col items-center justify-center text-center transition-colors duration-200",
              isDragging ? "border-black bg-gray-100" : "border-black bg-gray-50 hover:bg-gray-100"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-gray-100">
              <UploadCloud className="w-6 h-6 text-black" strokeWidth={2} />
            </div>
            <p className="text-xl font-semibold mb-2">Drag & drop your file here</p>
            <p className="text-sm text-gray-400 mb-8">or choose an option below</p>
            
            <div className="flex flex-wrap justify-center gap-3 w-full">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Browse Files
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden" 
                accept="image/*,video/*"
              />
              
              <button 
                onClick={async () => {
                  try {
                    const clipboardItems = await navigator.clipboard.read();
                    for (const clipboardItem of clipboardItems) {
                      const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
                      if (imageTypes.length > 0) {
                        const blob = await clipboardItem.getType(imageTypes[0]);
                        handleFileSelect(new File([blob], 'pasted-image.png', { type: blob.type }));
                        return;
                      }
                    }
                  } catch (err) {
                    alert('Clipboard access denied or no image found.');
                  }
                }}
                className="bg-white border border-gray-200 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Paste Image
              </button>
              
              <form onSubmit={handleUrlSubmit} className="relative flex">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste Media URL" 
                    className="bg-white border border-gray-200 px-4 py-2 pr-10 rounded-lg text-sm font-medium w-full md:w-48 focus:outline-none focus:border-black transition-colors"
                  />
                  <button type="submit" className="absolute right-2 text-gray-400 hover:text-black">
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
            <p className="mt-6 text-[11px] text-gray-400 uppercase tracking-widest">
              JPG, PNG, MP4, MOV • Max 50MB
            </p>
          </div>
        </div>
      )}

      {uploadState === 'processing' && (
        <div className="w-full max-w-xl p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-12 h-12 text-black animate-spin mb-6" />
          <p className="text-xl font-semibold mb-4">Removing watermark...</p>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadState === 'result' && mediaPreview && (
        <div className="w-full max-w-4xl flex flex-col items-center space-y-8 animate-in fade-in zoom-in-95 duration-500 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">Original</span>
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center relative">
                <img src={mediaPreview} alt="Original" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                  <div className="px-4 py-2 bg-white/80 backdrop-blur rounded text-black font-bold text-lg opacity-50 transform -rotate-12 border border-black/20">WATERMARK</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-black">Clean</span>
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                 <img src={mediaPreview} alt="Cleaned" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button 
              className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2"
              onClick={() => alert("Downloaded!")}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Download File</span>
            </button>
            <button 
              className="bg-white text-black border-2 border-black px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              onClick={() => {
                setUploadState('idle');
                setMediaPreview(null);
                setUrlInput('');
              }}
            >
              Try Another
            </button>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-4xl pt-8 border-t border-gray-100">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50">
            <Zap className="w-5 h-5 text-black" strokeWidth={2} />
          </div>
          <h3 className="font-bold text-sm">Fast Processing</h3>
          <p className="text-xs text-gray-500">Remove watermarks in under 10 seconds with our optimized engine.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <h3 className="font-bold text-sm">High Quality</h3>
          <p className="text-xs text-gray-500">AI-powered reconstruction preserves original resolution and details.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50">
            <Shield className="w-5 h-5 text-black" strokeWidth={2} />
          </div>
          <h3 className="font-bold text-sm">Secure & Private</h3>
          <p className="text-xs text-gray-500">All files are encrypted and automatically deleted after processing.</p>
        </div>
      </div>
    </main>
  );
}
