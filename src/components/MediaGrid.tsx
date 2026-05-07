import { Play } from 'lucide-react';

export interface MediaItem {
  url: string;
  mediaType: 'image' | 'video';
  width?: number;
  height?: number;
  previewHash?: string;
}

interface MediaGridProps {
  media: MediaItem[];
  onMediaClick?: (startingIndex: number) => void;
}

export default function MediaGrid({ media, onMediaClick }: MediaGridProps) {
  const count = media?.length || 0;

  if (count === 0) return null;

  const handleMediaClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMediaClick) onMediaClick(index);
  };

  // Helper to render individual media items beautifully
  const renderMediaItem = (item: MediaItem, index: number, className: string = '') => {
    const isVideo = item.mediaType === 'video';

    return (
      <div 
        key={`${item.url}-${index}`}
        onClick={(e) => handleMediaClick(e, index)}
        className={`relative w-full h-full cursor-pointer group bg-gray-100 dark:bg-gray-800 overflow-hidden ${className}`}
      >
        {isVideo ? (
          <>
            <video 
              src={item.url} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              muted 
              loop 
              playsInline
            />
            {/* Minimalist Play Indicator */}
            <div className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-lg">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </>
        ) : (
          <img 
            src={item.url} 
            alt={`Media ${index + 1}`} 
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
    );
  };

  // ==========================================
  // LAYOUT 1: SINGLE MEDIA (Large & Immersive)
  // ==========================================
  if (count === 1) {
    return (
      <div className="w-full max-h-[600px] rounded-[1.2rem] overflow-hidden border border-gray-100 dark:border-[#272729] bg-black mb-4">
        {renderMediaItem(media[0], 0, 'max-h-[600px]')}
      </div>
    );
  }

  // ==========================================
  // LAYOUT 2: SPLIT SCREEN (Side-by-Side)
  // ==========================================
  if (count === 2) {
    return (
      <div className="w-full aspect-[4/3] sm:aspect-[3/2] grid grid-cols-2 gap-[2px] rounded-[1.2rem] overflow-hidden border border-gray-100 dark:border-[#272729] bg-gray-200 dark:bg-[#272729] mb-4">
        {renderMediaItem(media[0], 0)}
        {renderMediaItem(media[1], 1)}
      </div>
    );
  }

  // ==========================================
  // LAYOUT 3: ONE LARGE, TWO SMALL STACKED
  // ==========================================
  if (count === 3) {
    return (
      <div className="w-full aspect-[4/3] sm:aspect-[3/2] grid grid-cols-2 grid-rows-2 gap-[2px] rounded-[1.2rem] overflow-hidden border border-gray-100 dark:border-[#272729] bg-gray-200 dark:bg-[#272729] mb-4">
        {/* Left column spans both rows */}
        {renderMediaItem(media[0], 0, 'row-span-2')}
        {/* Right column gets two standard squares */}
        {renderMediaItem(media[1], 1)}
        {renderMediaItem(media[2], 2)}
      </div>
    );
  }

  // ==========================================
  // LAYOUT 4 & 5+: 2x2 GRID (+MORE OVERLAY)
  // ==========================================
  return (
    <div className="w-full aspect-[4/3] sm:aspect-[3/2] grid grid-cols-2 grid-rows-2 gap-[2px] rounded-[1.2rem] overflow-hidden border border-gray-100 dark:border-[#272729] bg-gray-200 dark:bg-[#272729] mb-4">
      {renderMediaItem(media[0], 0)}
      {renderMediaItem(media[1], 1)}
      {renderMediaItem(media[2], 2)}
      
      {/* The 4th Tile (Handles +More logic) */}
      <div 
        onClick={(e) => handleMediaClick(e, 3)}
        className="relative w-full h-full cursor-pointer group bg-gray-100 dark:bg-gray-800 overflow-hidden"
      >
        <img 
          src={media[3].url} 
          alt="Media 4" 
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Dark Overlay with +X count if there are more than 4 items */}
        {count > 4 && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center transition-colors group-hover:bg-black/50">
            <span className="text-white text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              +{count - 4}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}