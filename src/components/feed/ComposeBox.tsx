import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Smile, Zap, Loader2, Globe, UserPlus } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

import SmartMediaUploader, { type UploadItem } from '../SmartMediaUploader';

const gf = new GiphyFetch('QkvvAzTY6DrGBFLYQS0u5E1MBTzw8eMP');

function useOnClickOutside(ref: React.RefObject<any>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

const compressImage = (file: File): Promise<{ blob: Blob; type: string; w: number; h: number }> =>
  new Promise((resolve, reject) => {
    // Note: If the file is a video, just return it without compressing via Canvas!
    if (file.type.startsWith('video/')) {
       return resolve({ blob: file, type: file.type, w: 0, h: 0 }); // You may want actual dimensions later
    }

    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      const MAX = 1920;
      if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r); }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      const t = 'image/webp';
      canvas.toBlob(b => {
        if (!b) return resolve({ blob: file, type: file.type, w: img.naturalWidth, h: img.naturalHeight });
        resolve(b.size < file.size ? { blob: b, type: t, w, h } : { blob: file, type: file.type, w: img.naturalWidth, h: img.naturalHeight });
      }, t, 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('fail'));
    img.src = URL.createObjectURL(file);
  });

function GiphyPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const fetchGifs = (offset: number) => search ? gf.search(search, { offset, limit: 10 }) : gf.trending({ offset, limit: 10 });

  return (
    <>
      <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-[#111] sm:hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#272729]">
          <span className="text-[14px] font-bold text-gray-900 dark:text-white">Pick a GIF</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-3 pt-3">
          <input type="text" placeholder="Search GIFs…" className="w-full bg-gray-100 dark:bg-[#0a0a0a] rounded-xl px-4 py-2.5 border border-gray-200 dark:border-[#272729] text-sm focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-600" onChange={e => setSearch(e.target.value)} value={search} autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Grid key={search} width={Math.min(window.innerWidth - 24, 600)} columns={3} fetchGifs={fetchGifs} onGifClick={(gif, e) => { e.preventDefault(); onSelect(gif.images.original.url); onClose(); }} noResultsMessage={<div className="text-center text-gray-500 mt-6 text-sm">No GIFs found</div>} />
        </div>
      </div>
      
      <div className="hidden sm:block absolute top-full left-0 mt-2 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#272729] z-[100] animate-in slide-in-from-top-2 duration-150">
        <div className="w-[300px] flex flex-col gap-2 p-3">
          <input type="text" placeholder="Search GIFs…" className="w-full bg-gray-100 dark:bg-[#0a0a0a] rounded-xl px-4 py-2 border border-gray-200 dark:border-[#272729] text-sm focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-600" onChange={e => setSearch(e.target.value)} value={search} />
          <div className="h-[280px] overflow-y-auto scrollbar-hide rounded-lg">
            <Grid key={search} width={275} columns={2} fetchGifs={fetchGifs} onGifClick={(gif, e) => { e.preventDefault(); onSelect(gif.images.original.url); onClose(); }} noResultsMessage={<div className="text-center text-gray-500 mt-4 text-sm">No GIFs found</div>} />
          </div>
        </div>
      </div>
    </>
  );
}

interface ComposeBoxProps {
  onSuccess: () => void;
  variant?: 'inline' | 'modal';
}

export default function ComposeBox({ onSuccess, variant = 'inline' }: ComposeBoxProps) {
  const { user } = useAuthStore();
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [isPosting, setIsPosting] = useState(false);
  
  // --- UPDATED STATE FOR MULTI-UPLOAD ---
  const [gifUrl, setGifUrl] = useState('');
  const [mediaFiles, setMediaFiles] = useState<UploadItem[]>([]);
  
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [composeFocused, setComposeFocused] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifMenuRef = useRef<HTMLDivElement>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(gifMenuRef, () => setShowGifPicker(false));
  useOnClickOutside(emojiMenuRef, () => setShowEmojiPicker(false));

  // Handle the very first time they click the Image icon in the toolbar
  const handleInitialImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems: UploadItem[] = files.slice(0, 10).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    }));

    setMediaFiles(newItems);
    setGifUrl(''); // Mutually exclusive with GIFs
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAttachment = () => {
    setGifUrl('');
    // Safely revoke memory for all currently selected images
    mediaFiles.forEach(m => URL.revokeObjectURL(m.preview));
    setMediaFiles([]);
  };

  const handlePostSubmit = async () => {
    if (!caption.trim() && !gifUrl && mediaFiles.length === 0) return;
    setIsPosting(true);
    
    try {
      let uploadedMedia: any[] = [];
      
      // --- UPDATED: MULTI-FILE S3 UPLOAD PIPELINE ---
      if (mediaFiles.length > 0) {
        // Upload all files concurrently!
        const uploadPromises = mediaFiles.map(async (item, index) => {
          const { blob, type, w, h } = await compressImage(item.file);
          const safeFilename = `post_${Date.now()}_${index}.${type.split('/')[1] || 'webp'}`;
          
          const presignRes = await api.post('/arena/media/presign', { filename: safeFilename, contentType: type });
          const presignData = presignRes.data || presignRes;
          
          if (presignData.fields && presignData.url) {
            const formData = new FormData();
            Object.keys(presignData.fields).forEach(key => formData.append(key, presignData.fields[key]));
            formData.append('file', blob);

            const uploadRes = await fetch(presignData.url, { method: 'POST', body: formData });
            if (!uploadRes.ok) throw new Error('S3 Upload failed');
            
            return { 
              objectKey: presignData.objectKey || presignData.key, 
              mediaType: item.type, 
              width: w, 
              height: h, 
              sortOrder: index 
            };
          } else {
            throw new Error("Backend did not return valid S3 POST policy fields.");
          }
        });

        // Wait for all to finish uploading
        uploadedMedia = await Promise.all(uploadPromises);
      } 
      // Handle fallback GIF case
      else if (gifUrl) {
        uploadedMedia = [{ url: gifUrl, mediaType: 'image', sortOrder: 0 }];
      }
      
      // Post to your backend
      await api.post('/arena/posts', { 
        caption: caption.trim(), 
        visibility, 
        media: uploadedMedia.length ? uploadedMedia : undefined 
      });
      
      setCaption(''); 
      clearAttachment(); 
      setComposeFocused(false);
      onSuccess();
    } catch (err) { 
      console.error(err);
      alert('Failed to post.'); 
    } finally { 
      setIsPosting(false); 
    }
  };

  const innerContent = (
    <>
      <div className={`flex gap-2.5 sm:gap-3 ${variant === 'inline' ? 'p-4' : ''}`}>
        <img
          src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=6366f1&color=fff`}
          alt=""
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            onFocus={() => setComposeFocused(true)}
            onBlur={() => !caption && setComposeFocused(false)}
            placeholder="What's sparking in your mind?"
            className={`w-full bg-transparent text-[14px] sm:text-[15px] text-gray-900 dark:text-white resize-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 leading-relaxed ${variant === 'modal' ? 'min-h-[100px]' : ''}`}
            style={{ minHeight: variant === 'inline' ? (composeFocused || caption || mediaFiles.length ? '72px' : '24px') : '100px', transition: 'min-height 0.25s cubic-bezier(0.4,0,0.2,1)' }}
            autoFocus={variant === 'modal'}
          />
          
          {/* --- SMART UPLOADER DROPPED HERE --- */}
          {mediaFiles.length > 0 && (
            <div className="mt-4">
              <SmartMediaUploader 
                media={mediaFiles} 
                onChange={setMediaFiles} 
                maxFiles={10} 
              />
            </div>
          )}

          {/* Renders GIF if selected */}
          {gifUrl && mediaFiles.length === 0 && (
            <div className="relative mt-2 inline-block max-w-full animate-in fade-in">
              <img src={gifUrl} alt="Selected GIF" className="max-h-40 sm:max-h-48 w-auto max-w-full rounded-xl border border-gray-200 dark:border-[#272729] object-cover" />
              <button onClick={clearAttachment} className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-md hover:scale-110 transition-transform">
                <X size={11} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`flex items-center justify-between ${variant === 'inline' ? 'px-4 pb-3' : 'pt-3 border-t border-gray-100 dark:border-[#272729]'}`}>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Note the "multiple" attribute added here! */}
          <input type="file" multiple accept="image/*,video/mp4,video/quicktime" className="hidden" ref={fileInputRef} onChange={handleInitialImageSelect} />

          <button onClick={() => fileInputRef.current?.click()} title="Add media" className={`p-1.5 rounded-lg transition-colors ${mediaFiles.length > 0 ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}>
            <ImageIcon size={16} strokeWidth={2} />
          </button>

          <div className="relative" ref={gifMenuRef}>
            <button onClick={() => { setShowGifPicker(p => !p); setShowEmojiPicker(false); }} className={`p-1.5 rounded-lg transition-colors ${gifUrl ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}>
              <span className="text-[9px] sm:text-[10px] font-black border-[1.5px] border-current px-1 rounded leading-[14px] flex tracking-wide">GIF</span>
            </button>
            {showGifPicker && <GiphyPicker onSelect={url => { setGifUrl(url); setMediaFiles([]); setShowGifPicker(false); }} onClose={() => setShowGifPicker(false)} />}
          </div>

          <div className="relative" ref={emojiMenuRef}>
            <button onClick={() => { setShowEmojiPicker(p => !p); setShowGifPicker(false); }} className={`p-1.5 rounded-lg transition-colors ${showEmojiPicker ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500 hover:text-yellow-500'}`}>
              <Smile size={16} strokeWidth={2} />
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full mt-2 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-top-2">
                <EmojiPicker onEmojiClick={(e) => { setCaption(p => p + e.emoji); setShowEmojiPicker(false); }} theme={'auto' as Theme} width={320} height={350} previewConfig={{ showPreview: false }} />
              </div>
            )}
          </div>

          <button onClick={() => setVisibility(p => p === 'public' ? 'friends' : 'public')} className="flex items-center gap-1 ml-2 px-1.5 sm:px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            {visibility === 'public' ? <Globe size={15} strokeWidth={2} /> : <UserPlus size={15} strokeWidth={2} />}
            <span className="text-[11px] sm:text-[12px] capitalize hidden sm:inline">{visibility}</span>
          </button>
        </div>

        <button onClick={handlePostSubmit} disabled={(!caption.trim() && !gifUrl && mediaFiles.length === 0) || isPosting} className="flex items-center gap-1.5 px-4 py-1.5 sm:py-2 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all active:scale-[0.97] disabled:opacity-35 disabled:cursor-not-allowed bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-md">
          {isPosting ? <Loader2 size={13} className="animate-spin" /> : <><Zap size={14} className="text-yellow-400 dark:text-yellow-500 fill-current" strokeWidth={3} /> Spark it</>}
        </button>
      </div>
    </>
  );

  if (variant === 'modal') {
    return <div className="flex flex-col gap-4">{innerContent}</div>;
  }

  return (
    <div className={`my-3 rounded-2xl border transition-all duration-200 ${(composeFocused || mediaFiles.length > 0) ? 'border-gray-300 dark:border-gray-500 shadow-md' : 'border-gray-200 dark:border-[#272729]'} bg-white dark:bg-[#1a1a1a]`}>
      {innerContent}
    </div>
  );
}