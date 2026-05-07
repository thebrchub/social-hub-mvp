import { useState, useRef, useCallback } from 'react';
import { X, Plus, CheckCircle2, Info, Film } from 'lucide-react';

export interface UploadItem {
  id: string; // Unique ID for drag-and-drop keys
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface SmartMediaUploaderProps {
  media: UploadItem[];
  onChange: (newMedia: UploadItem[]) => void;
  maxFiles?: number;
}

export default function SmartMediaUploader({ media, onChange, maxFiles = 10 }: SmartMediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // --- FILE HANDLING ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = maxFiles - media.length;
    const allowedFiles = files.slice(0, remainingSlots);

    const newItems: UploadItem[] = allowedFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 9), // Quick unique ID
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    }));

    onChange([...media, ...newItems]);
    
    // Reset input so the same file can be uploaded again if deleted
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (idToRemove: string) => {
    // Revoke the object URL to prevent memory leaks!
    const itemToRemove = media.find(m => m.id === idToRemove);
    if (itemToRemove) URL.revokeObjectURL(itemToRemove.preview);
    
    onChange(media.filter(m => m.id !== idToRemove));
  };

  // --- NATIVE DRAG & DROP LOGIC ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires data to be set for drag to work
    e.dataTransfer.setData('text/plain', id); 
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = media.findIndex(m => m.id === draggedId);
    const targetIndex = media.findIndex(m => m.id === targetId);

    if (draggedIndex < 0 || targetIndex < 0) return;

    const newMedia = [...media];
    const [draggedItem] = newMedia.splice(draggedIndex, 1);
    newMedia.splice(targetIndex, 0, draggedItem);

    onChange(newMedia);
    setDraggedId(null);
  }, [draggedId, media, onChange]);

  // --- DYNAMIC FEEDBACK UI ---
  const renderFeedback = () => {
    if (media.length === 0) return null;

    if (media.length <= 4) {
      return (
        <div className="flex items-center gap-2 mt-3 text-[13px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 p-3 rounded-xl border border-green-200 dark:border-green-500/20 animate-in fade-in">
          <CheckCircle2 size={16} strokeWidth={2.5} />
          Perfect! Your post will show as a {media.length}-media grid.
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 mt-3 text-[13px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 p-3 rounded-xl border border-purple-200 dark:border-purple-500/20 animate-in fade-in">
        <Info size={16} strokeWidth={2.5} />
        Nice! Your post will show a preview with +{media.length - 4} more.
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-2">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple 
        accept="image/*,video/mp4,video/quicktime"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden" 
      />

      {/* Media Thumbnails Strip */}
      <div className="flex flex-wrap gap-3">
        {media.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, item.id)}
            onDragEnd={() => setDraggedId(null)}
            className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing group transition-all ${
              draggedId === item.id 
                ? 'opacity-40 border-blue-500 scale-95' 
                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {item.type === 'video' ? (
              <video src={item.preview} className="w-full h-full object-cover" />
            ) : (
              <img src={item.preview} alt="upload preview" className="w-full h-full object-cover" />
            )}
            
            {/* Remove Button (Shows on hover) */}
            <button 
              type="button"
              onClick={() => removeMedia(item.id)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
            >
              <X size={12} strokeWidth={3} />
            </button>
            
            {/* Video Indicator */}
            {item.type === 'video' && (
              <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-white font-bold flex items-center gap-1">
                <Film size={10} /> Video
              </div>
            )}
          </div>
        ))}

        {/* Add More Button */}
        {media.length < maxFiles && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-[#333] hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 flex flex-col items-center justify-center transition-all gap-1 group"
          >
            <Plus size={24} className="group-hover:scale-110 transition-transform" />
            {media.length === 0 && <span className="text-[10px] font-bold">Add Media</span>}
          </button>
        )}
      </div>

      {/* Smart Feedback Banner */}
      {renderFeedback()}
      
    </div>
  );
}