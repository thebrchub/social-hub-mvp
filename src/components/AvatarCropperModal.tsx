// src/components/AvatarCropperModal.tsx
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, RotateCw, FlipHorizontal, FlipVertical, ZoomIn, ZoomOut } from 'lucide-react';

// --- CANVAS UTILITY FUNCTION ---
// This takes the raw image, applies the user's crop/rotation/flip, and returns a new Image URL
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: any,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Calculate bounding box for the rotated image
  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
  canvas.width = safeArea;
  canvas.height = safeArea;

  // Translate to center, rotate, flip, and draw
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(
    image,
    safeArea / 2 - image.width / 2,
    safeArea / 2 - image.height / 2
  );

  // Extract the cropped area
  const data = ctx.getImageData(0, 0, safeArea, safeArea);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y)
  );

  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(URL.createObjectURL(file!));
    }, 'image/jpeg');
  });
};


// --- THE COMPONENT ---
interface AvatarCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
}

export default function AvatarCropperModal({ isOpen, imageSrc, onClose, onCropComplete }: AvatarCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = useCallback((crop: any) => setCrop(crop), []);
  const onZoomChange = useCallback((zoom: number) => setZoom(zoom), []);
  const onCropAreaChange = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, flip);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#272729] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#272729]">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Avatar</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative w-full h-[300px] sm:h-[400px] bg-gray-100 dark:bg-black overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={onCropAreaChange}
            onZoomChange={onZoomChange}
            transform={[
                `translate(${crop.x}px, ${crop.y}px)`,
                `rotate(${rotation}deg)`,
                `scale(${flip.horizontal ? -zoom : zoom}, ${flip.vertical ? -zoom : zoom})`
            ].join(' ')}
          />
        </div>

        {/* Controls */}
        <div className="p-6 space-y-6 bg-white dark:bg-[#1a1a1a]">
          
          {/* Zoom Slider */}
          <div className="flex items-center gap-4">
            <ZoomOut size={18} className="text-gray-500" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <ZoomIn size={18} className="text-gray-500" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setRotation(r => r + 90)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#272729] text-gray-600 dark:text-gray-400 transition-colors">
              <RotateCw size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Rotate</span>
            </button>
            <button onClick={() => setFlip(f => ({ ...f, horizontal: !f.horizontal }))} className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#272729] text-gray-600 dark:text-gray-400 transition-colors">
              <FlipHorizontal size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Flip H</span>
            </button>
            <button onClick={() => setFlip(f => ({ ...f, vertical: !f.vertical }))} className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#272729] text-gray-600 dark:text-gray-400 transition-colors">
              <FlipVertical size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Flip V</span>
            </button>
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSave} 
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Check size={18} strokeWidth={3} /> Save Avatar
          </button>
        </div>

      </div>
    </div>
  );
}