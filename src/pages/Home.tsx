import { cn } from '../lib/utils';
import { processImageClientSide } from '../lib/imageProcessor';
import { UploadCloud, CheckCircle2, Zap, Shield, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { addHistoryItem } from '../lib/history';
import { useNavigate } from 'react-router-dom';

type UploadState = 'idle' | 'uploading' | 'selecting' | 'processing' | 'result' | 'error';

export default function Home() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Processing...');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video'>('image');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Selection box state
  const [selectionBox, setSelectionBox] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [startPos, setStartPos] = useState({x: 0, y: 0});
  const [isDrawing, setIsDrawing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaWrapRef = useRef<HTMLDivElement>(null);

  // Handle paste events globally
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (uploadState !== 'idle') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
          const file = item.getAsFile();
          if (file) handleFileSelect(file);
          break;
        }
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [uploadState]);

  const handleFileSelect = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      alert('File too large. Maximum size is 100MB.');
      return;
    }
    
    setUploadState('uploading');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setFileId(data.id);
      setOriginalFile(file);
      setFileType(data.type);
      setMediaPreview(data.url);
      setUploadState('selecting');
      setSelectionBox(null);
    } catch (err: any) {
      setErrorMessage(err.message);
      setUploadState('error');
    }
  };

  const startProcessing = async () => {
    if (!fileId || !originalFile || !selectionBox || !mediaWrapRef.current) return;
    setUploadState('processing');
    setProgress(0);
    setStatusText('Initiating processing...');

    const rect = mediaWrapRef.current.getBoundingClientRect();
    const box = selectionBox;

    try {
      if (fileType === 'image') {
        // Same trick as mediaclean-ai: inpaint on a canvas in the browser, no API key needed
        const result = await processImageClientSide(
          originalFile,
          box,
          rect.width,
          rect.height,
          (pct, status) => { setProgress(pct); setStatusText(status); }
        );

        // Upload the cleaned image so it has a permanent URL (blob URLs die on reload, which would break History)
        let finalUrl = result.outputUrl;
        try {
          const blob = await (await fetch(result.outputUrl)).blob();
          const ext = blob.type === 'image/png' ? 'png' : 'jpg';
          const fd = new FormData();
          fd.append('file', new File([blob], `cleaned.${ext}`, { type: blob.type }));
          const up = await fetch('/api/upload', { method: 'POST', body: fd });
          const upData = await up.json();
          if (up.ok && upData.url) finalUrl = upData.url;
        } catch { /* fall back to the blob URL */ }

        setResultUrl(finalUrl);
        addHistoryItem({ url: finalUrl, type: 'image', source: 'remover' });
        setUploadState('result');
      } else {
        const el = mediaWrapRef.current.querySelector('video');
        const res = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: fileId,
            type: fileType,
            box,
            renderedWidth: rect.width,
            renderedHeight: rect.height,
            naturalWidth: el?.videoWidth || 0,
            naturalHeight: el?.videoHeight || 0,
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Processing failed');
        pollVideoJob(data.jobId);
      }
    } catch (err: any) {
      const msg = err.message === 'Failed to fetch' ? 'Connection failed or network timeout. Please check your connection and try again.' : err.message;
      setErrorMessage(msg);
      setUploadState('error');
    }
  };

  const pollVideoJob = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Status fetch failed');
        
        if (data.status === 'error') {
          clearInterval(interval);
          setErrorMessage(data.error || 'Video processing failed');
          setUploadState('error');
          return;
        }

        setProgress(data.progress);
        setStatusText(
          data.status === 'processing' ? `Removing watermark (${data.progress}%)...` : 'Working...'
        );

        if (data.status === 'done') {
          clearInterval(interval);
          setResultUrl(data.resultUrl);
          addHistoryItem({ url: data.resultUrl, type: 'video', source: 'remover' });
          setUploadState('result');
        }
      } catch (err: any) {
        clearInterval(interval);
        setErrorMessage(err.message);
        setUploadState('error');
      }
    }, 2000);
  };

  // Drawing logic (pointer events so it also works on touch screens)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({x, y});
    setSelectionBox({x, y, w: 0, h: 0});
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    setSelectionBox({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      w: Math.abs(currentX - startPos.x),
      h: Math.abs(currentY - startPos.y)
    });
  };

  const handlePointerUp = () => setIsDrawing(false);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      handleFileSelect(file);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-20 py-10 w-full overflow-y-auto">
      <div className="text-center space-y-4 max-w-2xl mb-12">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          Remove Watermarks <span className="text-gray-300 italic">Instantly.</span>
        </h1>
        <p className="text-lg text-gray-500">
          Upload your image or video, draw a box around the watermark, and remove it in seconds. Runs without any API key.
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
            </div>
            <p className="mt-6 text-[11px] text-gray-400 uppercase tracking-widest">
              JPG, PNG, WEBP, MP4, MOV • Max 100MB
            </p>
          </div>
        </div>
      )}

      {uploadState === 'uploading' && (
        <div className="w-full max-w-xl p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-12 h-12 text-black animate-spin mb-6" />
          <p className="text-xl font-semibold mb-4">Uploading file...</p>
        </div>
      )}

      {uploadState === 'selecting' && mediaPreview && (
        <div className="w-full max-w-4xl flex flex-col items-center space-y-6 animate-in fade-in zoom-in-95 duration-500 mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 text-center">
            Draw a box around the watermark.
          </p>
          <div 
            ref={mediaWrapRef}
            className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 w-full select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ cursor: 'crosshair', touchAction: 'none' }}
          >
            {fileType === 'video' ? (
               <video src={mediaPreview} className="block w-full h-auto pointer-events-none" muted playsInline />
            ) : (
               <img src={mediaPreview} alt="Target" className="block w-full h-auto pointer-events-none" draggable={false} />
            )}
            
            {selectionBox && selectionBox.w > 0 && selectionBox.h > 0 && (
              <div 
                className="absolute border-2 border-red-500 bg-red-500/20"
                style={{
                  left: selectionBox.x,
                  top: selectionBox.y,
                  width: selectionBox.w,
                  height: selectionBox.h
                }}
              />
            )}
          </div>
          
          <div className="flex space-x-4">
            <button
              className={cn(
                "px-8 py-3 rounded-full font-semibold transition-colors",
                selectionBox && selectionBox.w > 8 && selectionBox.h > 8
                  ? "bg-black text-white hover:bg-gray-800"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
              disabled={!(selectionBox && selectionBox.w > 8 && selectionBox.h > 8)}
              onClick={() => startProcessing()}
            >
              Remove Selected Area
            </button>
          </div>
        </div>
      )}

      {uploadState === 'processing' && (
        <div className="w-full max-w-xl p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-12 h-12 text-black animate-spin mb-6" />
          <p className="text-xl font-semibold mb-4">{statusText}</p>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadState === 'error' && (
        <div className="w-full max-w-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <p className="text-xl font-bold mb-2">Processing Failed</p>
          <p className="text-gray-500 mb-8">{errorMessage}</p>
          <button 
            className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors"
            onClick={() => setUploadState('idle')}
          >
            Try Again
          </button>
        </div>
      )}

      {uploadState === 'result' && mediaPreview && resultUrl && (
        <div className="w-full max-w-5xl flex flex-col items-center space-y-8 animate-in fade-in zoom-in-95 duration-500 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">Original (Uploaded)</span>
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                {fileType === 'video' ? (
                  <video src={mediaPreview} controls className="w-full h-full object-contain bg-black" />
                ) : (
                  <img src={mediaPreview} alt="Original" className="w-full h-full object-contain" />
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-black">Cleaned (Processed)</span>
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                 {fileType === 'video' ? (
                  <video src={resultUrl} controls autoPlay loop className="w-full h-full object-contain bg-black" />
                ) : (
                  <img src={resultUrl} alt="Cleaned" className="w-full h-full object-contain" />
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <a 
              href={resultUrl}
              download={`cleaned-${resultUrl.split('/').pop()}`}
              className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Download File</span>
            </a>
            <button 
              className="bg-white text-black border-2 border-black px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              onClick={() => {
                setUploadState('idle');
                setMediaPreview(null);
                setFileId(null);
                setOriginalFile(null);
                setResultUrl(null);
                setSelectionBox(null);
              }}
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-4xl pt-8 border-t border-gray-100 mt-12">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50">
            <Zap className="w-5 h-5 text-black" strokeWidth={2} />
          </div>
          <h3 className="font-bold text-sm">Smart Fill</h3>
          <p className="text-xs text-gray-500">Images are rebuilt right in your browser by blending the surrounding pixels over the watermark.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <h3 className="font-bold text-sm">Video Support</h3>
          <p className="text-xs text-gray-500">Videos are cleaned frame by frame with FFmpeg's delogo filter, audio kept.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50">
            <Shield className="w-5 h-5 text-black" strokeWidth={2} />
          </div>
          <h3 className="font-bold text-sm">Secure Environment</h3>
          <p className="text-xs text-gray-500">Your files are processed in an isolated sandbox and cleared automatically.</p>
        </div>
      </div>
    </main>
  );
}
