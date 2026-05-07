import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Image as ImageIcon, Smile, Zap, Loader2, Globe, UserPlus 
} from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import Modal from '../Modal';

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
          <span className="text-[14px] font-bold text-gray-900 dark:text-white">Pick a GIF</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-3 pt-3">
          <input type="text" placeholder="Search GIFs…" className="w-full bg-gray-100 dark:bg-black rounded-xl px-4 py-2.5 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none text-gray-900 dark:text-white" onChange={e => setSearch(e.target.value)} value={search} autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Grid key={search} width={Math.min(window.innerWidth - 24, 600)} columns={3} fetchGifs={fetchGifs} onGifClick={(gif, e) => { e.preventDefault(); onSelect(gif.images.original.url); onClose(); }} noResultsMessage={<div className="text-center text-gray-500 mt-6 text-sm">No GIFs found</div>} />
        </div>
      </div>
      <div className="hidden sm:block absolute top-full left-0 mt-2 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 z-[100] animate-in slide-in-from-top-2 duration-150">
        <div className="w-[300px] flex flex-col gap-2 p-3">
          <input type="text" placeholder="Search GIFs…" className="w-full bg-gray-100 dark:bg-black rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none text-gray-900 dark:text-white" onChange={e => setSearch(e.target.value)} value={search} />
          <div className="h-[280px] overflow-y-auto scrollbar-hide rounded-lg">
            <Grid key={search} width={275} columns={2} fetchGifs={fetchGifs} onGifClick={(gif, e) => { e.preventDefault(); onSelect(gif.images.original.url); onClose(); }} noResultsMessage={<div className="text-center text-gray-500 mt-4 text-sm">No GIFs found</div>} />
          </div>
        </div>
      </div>
    </>
  );
}

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PostModal({ isOpen, onClose, onSuccess }: PostModalProps) {
  const { user } = useAuthStore();
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [isPosting, setIsPosting] = useState(false);
  const [gifUrl, setGifUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifMenuRef = useRef<HTMLDivElement>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null);
  
  useOnClickOutside(gifMenuRef, () => setShowGifPicker(false));
  useOnClickOutside(emojiMenuRef, () => setShowEmojiPicker(false));

  // Clean slate every time modal opens
  useEffect(() => {
    if (isOpen) {
      setCaption(''); clearAttachment(); setVisibility('public');
    }
  }, [isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setGifUrl(''); setImageFile(file); setImagePreview(URL.createObjectURL(file)); e.target.value = '';
  };

  const clearAttachment = () => {
    setGifUrl(''); setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
  };

  const handlePostSubmit = async () => {
    if (!caption.trim() && !gifUrl && !imageFile) return;
    setIsPosting(true);
    
    try {
      let media: any[] = [];
      if (imageFile) {
        const { blob, type, w, h } = await compressImage(imageFile);
        const safeFilename = `post_${Date.now()}.webp`;
        const presignRes = await api.post('/arena/media/presign', { filename: safeFilename, contentType: type });
        const presignData = presignRes.data || presignRes;
        
        if (presignData.fields && presignData.url) {
          const formData = new FormData();
          Object.keys(presignData.fields).forEach(key => formData.append(key, presignData.fields[key]));
          formData.append('file', blob);

          const uploadRes = await fetch(presignData.url, { method: 'POST', body: formData });
          if (!uploadRes.ok) throw new Error('S3 Upload failed');
          
          media = [{ objectKey: presignData.objectKey || presignData.key, mediaType: 'image', width: w, height: h, sortOrder: 0 }];
        } else {
          throw new Error("Backend did not return valid S3 POST policy fields.");
        }
      }

      if (gifUrl) media = [{ url: gifUrl, mediaType: 'image', sortOrder: 0 }];
      
      await api.post('/arena/posts', { caption: caption.trim(), visibility, media: media.length ? media : undefined });
      
      onSuccess();
      onClose();
    } catch (err) { 
      console.error(err);
      alert('Failed to post. Please try again.'); 
    } finally { 
      setIsPosting(false); 
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a Spark">
      <div className="flex flex-col gap-4">
        
        <div className="flex gap-3">
          <img
            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=6366f1&color=fff`}
            alt=""
            className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="What's sparking in your mind?"
              className="w-full bg-transparent text-[15px] sm:text-[16px] text-gray-900 dark:text-white resize-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 min-h-[100px]"
              autoFocus
            />
            {(gifUrl || imagePreview) && (
              <div className="relative mt-2 inline-block max-w-full">
                <img src={gifUrl || imagePreview} alt="" className="max-h-60 w-auto max-w-full rounded-xl border border-gray-200 dark:border-white/10 object-cover" />
                <button onClick={clearAttachment} className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-md hover:scale-110 transition-transform">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-1">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />

            <button onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-lg transition-colors ${imageFile ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <ImageIcon size={18} strokeWidth={2} />
            </button>

            <div className="relative" ref={gifMenuRef}>
              <button onClick={() => { setShowGifPicker(p => !p); setShowEmojiPicker(false); }} className={`p-2 rounded-lg transition-colors ${gifUrl ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <span className="text-[10px] font-black border-[1.5px] border-current px-1 rounded leading-[14px] flex tracking-wide">GIF</span>
              </button>
              {showGifPicker && <GiphyPicker onSelect={url => { setGifUrl(url); setImageFile(null); setImagePreview(''); setShowGifPicker(false); }} onClose={() => setShowGifPicker(false)} />}
            </div>

            <div className="relative" ref={emojiMenuRef}>
              <button onClick={() => { setShowEmojiPicker(p => !p); setShowGifPicker(false); }} className={`p-2 rounded-lg transition-colors ${showEmojiPicker ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-600 hover:text-yellow-500'}`}>
                <Smile size={18} strokeWidth={2} />
              </button>
              {showEmojiPicker && (
                <div className="absolute top-full mt-2 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-top-2">
                  <EmojiPicker onEmojiClick={(e) => { setCaption(p => p + e.emoji); setShowEmojiPicker(false); }} theme={'auto' as Theme} width={320} height={350} previewConfig={{ showPreview: false }} />
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-white/[0.08] mx-1"></div>

            <button onClick={() => setVisibility(p => p === 'public' ? 'friends' : 'public')} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              {visibility === 'public' ? <Globe size={16} strokeWidth={2} /> : <UserPlus size={16} strokeWidth={2} />}
              <span className="text-[12px] capitalize hidden sm:inline">{visibility}</span>
            </button>
          </div>

          <button onClick={handlePostSubmit} disabled={(!caption.trim() && !gifUrl && !imageFile) || isPosting} className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[14px] font-bold transition-all active:scale-[0.97] disabled:opacity-35 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20">
            {isPosting ? <Loader2 size={16} className="animate-spin" /> : <><Zap size={14} className="text-yellow-400" strokeWidth={3} /> Post</>}
          </button>
        </div>

      </div>
    </Modal>
  );
}