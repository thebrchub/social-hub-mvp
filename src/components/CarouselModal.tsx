import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { type MediaItem } from '../components/feed/PostCard'; // Adjust import based on where your MediaItem interface lives

interface CarouselModalProps {
  isOpen: boolean;
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function CarouselModal({ isOpen, media, initialIndex, onClose }: CarouselModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Sync index when modal opens
  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

  // Handle Keyboard Navigation (Esc to close, Arrows to navigate)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrev();
  }, [isOpen, currentIndex, media.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    // Prevent background scrolling when modal is open
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [handleKeyDown, isOpen]);

  if (!isOpen || !media || media.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const currentItem = media[currentIndex];

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between p-4 sm:p-6 text-white absolute top-0 w-full z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="font-medium text-sm tracking-widest pointer-events-auto bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md">
          {currentIndex + 1} / {media.length}
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-black/50 hover:bg-white/20 rounded-full transition-colors pointer-events-auto backdrop-blur-md"
        >
          <X size={20} />
        </button>
      </div>

      {/* --- MAIN VIEWING AREA --- */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden touch-pan-y">
        
        {/* Left Nav Button */}
        {media.length > 1 && (
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="absolute left-4 sm:left-8 z-10 p-3 rounded-full bg-black/50 hover:bg-white/20 text-white backdrop-blur-md transition-colors hidden sm:block"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* The Media */}
        <div className="w-full h-full max-w-6xl max-h-[80vh] p-4 flex items-center justify-center relative animate-in zoom-in-95 duration-200" key={currentIndex}>
          {currentItem.mediaType === 'video' ? (
            <video 
              src={currentItem.url} 
              controls 
              autoPlay 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
          ) : (
            <img 
              src={currentItem.url} 
              alt={`Gallery image ${currentIndex + 1}`} 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
          )}
        </div>

        {/* Right Nav Button */}
        {media.length > 1 && (
          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-4 sm:right-8 z-10 p-3 rounded-full bg-black/50 hover:bg-white/20 text-white backdrop-blur-md transition-colors hidden sm:block"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* --- THUMBNAIL STRIP FOOTER --- */}
      {media.length > 1 && (
        <div className="h-24 sm:h-32 w-full bg-gradient-to-t from-black to-transparent flex items-end justify-center pb-4 sm:pb-6 px-4 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide snap-x px-4 max-w-4xl mx-auto">
            {media.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative h-14 sm:h-16 aspect-square shrink-0 snap-center rounded-lg overflow-hidden transition-all duration-300 ${
                  currentIndex === idx 
                    ? 'ring-2 ring-blue-500 scale-110 opacity-100 z-10' 
                    : 'opacity-40 hover:opacity-80 scale-95 hover:scale-100'
                }`}
              >
                {item.mediaType === 'video' ? (
                  <>
                    <video src={item.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play size={12} className="text-white fill-white" />
                    </div>
                  </>
                ) : (
                  <img src={item.url} className="w-full h-full object-cover" alt={`Thumbnail ${idx}`} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}