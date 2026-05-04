import { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Loader2, Smile } from 'lucide-react'; // <-- Added Smile
import { api } from '../../services/api';
import { type Post } from './PostCard';
import { useAuthStore } from '../../store/useAuthStore';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import EmojiPicker, { Theme } from 'emoji-picker-react';

const gf = new GiphyFetch('QkvvAzTY6DrGBFLYQS0u5E1MBTzw8eMP');


function useOnClickOutside(ref: React.RefObject<any>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

const compressImage = (file: File): Promise<{ blob: Blob, type: string, w: number, h: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      const MAX_DIM = 1920;
      if (w > MAX_DIM || h > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, w, h);
      const outType = 'image/webp';
      canvas.toBlob(blob => {
        if (!blob) return resolve({ blob: file, type: file.type, w: img.naturalWidth, h: img.naturalHeight });
        if (blob.size < file.size) resolve({ blob, type: outType, w, h });
        else resolve({ blob: file, type: file.type, w: img.naturalWidth, h: img.naturalHeight });
      }, outType, 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
};

function GiphyPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [search, setSearch] = useState('');
  const fetchGifs = (offset: number) => search ? gf.search(search, { offset, limit: 10 }) : gf.trending({ offset, limit: 10 });
  return (
    <div className="w-[300px] flex flex-col gap-2 p-3">
      <input type="text" placeholder="Search GIFs..." className="w-full bg-gray-100 dark:bg-[#111] rounded-xl px-4 py-2 border border-gray-200 dark:border-[#272729] text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white" onChange={(e) => setSearch(e.target.value)} value={search} />
      <div className="h-[300px] overflow-y-auto scrollbar-hide rounded-lg">
        <Grid key={search} width={275} columns={2} fetchGifs={fetchGifs} onGifClick={(gif, e) => { e.preventDefault(); onSelect(gif.images.original.url); }} noResultsMessage={<div className="text-center text-gray-500 mt-4 text-sm font-bold">No GIFs found</div>} />
      </div>
    </div>
  );
}

interface QuoteRippleModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onSuccess: (newId?: number) => void;
}

export default function QuoteRippleModal({ isOpen, onClose, post, onSuccess }: QuoteRippleModalProps) {
  const currentUser = useAuthStore(state => state.user);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Media & Emoji States
  const [gifUrl, setGifUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // <-- New State
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifMenuRef = useRef<HTMLDivElement>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null); // <-- New Ref
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  useOnClickOutside(gifMenuRef, () => setShowGifPicker(false));
  useOnClickOutside(emojiMenuRef, () => setShowEmojiPicker(false));

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCaption('');
      clearAttachment();
      setShowEmojiPicker(false);
      setShowGifPicker(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    setGifUrl(''); 
    setImageFile(file); 
    setImagePreview(URL.createObjectURL(file)); 
    e.target.value = '';
  };

  const clearAttachment = () => {
    setGifUrl(''); 
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
  };

  const insertEmoji = (emoji: string) => {
    setCaption(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if ((!caption.trim() && !gifUrl && !imageFile) || isSubmitting) return;
    setIsSubmitting(true);

    try {
      let uploadedMediaArray: any[] | undefined = undefined;
      let finalGifUrl = gifUrl;

      // Handle Image Upload (Using the S3 POST Policy fix)
      if (imageFile) {
        const { blob, type, w, h } = await compressImage(imageFile);
        const safeFilename = `quote_${Date.now()}.webp`; 
        
        const presignRes = await api.post(`/arena/media/presign`, { filename: safeFilename, contentType: type });
        const presignData = presignRes.data || presignRes;
        
        if (presignData.fields && presignData.url) {
          const formData = new FormData();
          Object.keys(presignData.fields).forEach(key => {
            formData.append(key, presignData.fields[key]);
          });
          formData.append('file', blob);

          const uploadRes = await fetch(presignData.url, { method: 'POST', body: formData });
          if (!uploadRes.ok) throw new Error("Upload failed with status: " + uploadRes.status);
          
          uploadedMediaArray = [{ 
            objectKey: presignData.objectKey || presignData.key, 
            mediaType: 'image', 
            width: w, 
            height: h, 
            sortOrder: 0 
          }];
        } else {
          throw new Error("Backend did not return valid S3 POST policy fields.");
        }
      }

      const payload: any = { caption: caption.trim() };
      if (uploadedMediaArray) payload.media = uploadedMediaArray;
      if (finalGifUrl) payload.gifUrl = finalGifUrl; 

      const res = await api.post(`/arena/posts/${post.id}/repost`, payload);
      
      onSuccess(res.id || res.postId || (res.data && res.data.id));
      onClose();
      
      // --- NEW: Take user instantly to the feed and force a fresh load! ---
      window.location.href = '/dashboard'; 
      
    } catch (err) {
      alert("Failed to post quote ripple.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Increased width to max-w-[600px] */}
      <div className="relative bg-white dark:bg-[#0a0a0a] w-[95vw] max-w-[600px] rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-[#272729]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1a1a1a] shrink-0">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-full transition-colors text-gray-900 dark:text-white">
            <X size={20} strokeWidth={2.5} />
          </button>
          <h2 className="font-display font-bold text-gray-900 dark:text-white text-lg absolute left-1/2 -translate-x-1/2">Quote Ripple</h2>
          <div className="w-10"></div> 
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          
          <div className="flex gap-3">
            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-[#272729]">
               <img 
                  src={currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${(currentUser as any)?.name || currentUser?.username || 'U'}`} 
                  className="w-full h-full object-cover" 
                  alt="You" 
               />
            </div>
            
            {/* Text Area & Media Preview */}
            <div className="flex-1 flex flex-col">
              <textarea
                ref={inputRef}
                autoFocus
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a comment..."
                className="w-full bg-transparent text-gray-900 dark:text-white resize-none outline-none text-[17px] min-h-[100px] placeholder:text-gray-400"
              />
              
              {/* Media Preview (Image or GIF) */}
              {(gifUrl || imagePreview) && (
                <div className="relative mb-4 inline-block self-start">
                  <img src={gifUrl || imagePreview} alt="Attachment preview" className="max-h-64 rounded-2xl border border-gray-200 dark:border-[#272729] object-cover" />
                  <button onClick={clearAttachment} className="absolute -top-2 -right-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full p-1.5 shadow-md hover:scale-105 transition-transform">
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Embedded Original Post */}
          <div className="ml-12 border border-gray-200 dark:border-[#272729] rounded-2xl p-4 bg-gray-50 dark:bg-[#030303]">
            <div className="flex items-center gap-2 mb-2">
              <img src={post.avatarUrl || `https://ui-avatars.com/api/?name=${post.displayName}`} className="w-5 h-5 rounded-full object-cover shrink-0" alt="Avatar" />
              <span className="font-bold text-[14px] text-gray-900 dark:text-white truncate">{post.displayName}</span>
              <span className="text-[13px] text-gray-500 truncate">@{post.username}</span>
            </div>
            <p className="text-[15px] text-gray-800 dark:text-gray-200 line-clamp-3">{post.caption || "Media post"}</p>
          </div>
          
        </div>

        {/* Footer Action Bar */}
        <div className="p-3 border-t border-gray-100 dark:border-[#1a1a1a] flex items-center justify-between shrink-0 bg-white dark:bg-[#0a0a0a] rounded-b-[2rem]">
          <div className="flex items-center gap-1 ml-12">
            
            {/* Image Upload */}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#272729]">
              <ImageIcon size={20} />
            </button>
            
            {/* GIF Picker */}
            <div className="relative" ref={gifMenuRef}>
              <button onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }} className="p-2.5 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#272729] flex items-center justify-center">
                <div className="font-black text-[10px] border-2 border-current px-1 rounded flex items-center justify-center h-[20px]">GIF</div>
              </button>
              {showGifPicker && (
                <div className="absolute bottom-full left-0 mb-2 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#272729] animate-in slide-in-from-bottom-2 duration-200 z-50">
                  <GiphyPicker onSelect={(url) => { setGifUrl(url); setImageFile(null); setImagePreview(''); setShowGifPicker(false); }} />
                </div>
              )}
            </div>

            {/* Full Emoji Picker */}
            <div className="relative" ref={emojiMenuRef}>
              <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }} className="p-2.5 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#272729]">
                <Smile size={20} />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 shadow-2xl rounded-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50 [&_*::-webkit-scrollbar]:hidden [&_*]:[scrollbar-width:none]">
                  {/* Using your installed library! */}
                  <EmojiPicker 
                    onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                    theme={Theme.AUTO} // <-- The TypeScript-approved way!
                    previewConfig={{ showPreview: false }} 
                  />
                </div>
              )}
            </div>

          </div>

          <button 
            onClick={handleSubmit} 
            disabled={(!caption.trim() && !gifUrl && !imageFile) || isSubmitting} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-[15px] transition-all disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-[#272729] flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Quote
          </button>
        </div>

      </div>
    </div>
  );
}