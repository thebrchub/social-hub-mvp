import { useEffect, useRef } from 'react';

export const InteractiveLogo = () => {
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const moveEye = (eyeContainer: HTMLDivElement | null) => {
        if (!eyeContainer) return;
        
        const rect = eyeContainer.getBoundingClientRect();
        const pupil = eyeContainer.firstChild as HTMLDivElement;
        if (!pupil) return;

        // Find the absolute center of the eye container
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;

        // Calculate angle to the mouse cursor
        const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);

        // --- EXTREMELY TIGHT LEASH ---
        const maxRadius = rect.width / 4; 

        // Calculate distance to mouse, capped at our new tiny maxRadius
        const distanceToMouse = Math.hypot(e.clientX - eyeCenterX, e.clientY - eyeCenterY);
        const distance = Math.min(distanceToMouse / 15, maxRadius); 

        // Convert back to X/Y coordinates
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        // Move the pupil
        pupil.style.transform = `translate(${x}px, ${y}px)`;
      };

      // 60FPS smooth animation
      requestAnimationFrame(() => {
        moveEye(leftEyeRef.current);
        moveEye(rightEyeRef.current);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    // Outer flex container to align the logo and text side-by-side
    <div className="flex items-center justify-center gap-3 md:gap-5 animate-float cursor-default">
      
      {/* --- LOGO GRAPHIC CONTAINER --- */}
      <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 flex items-center justify-center group drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]">
        
        {/* --- WHITE GRADIENT GLOW --- */}
        <div className="absolute inset-1 bg-white/20 blur-xl rounded-full z-[-1] transition-opacity duration-500 group-hover:bg-white/30"></div>

        {/* 1. THE LOGO MASK */}
        <img 
          src="/logo-no-pupils.svg" 
          alt="zQuab Mascot" 
          className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none" 
        />

        {/* 2. LEFT EYE TRACKER */}
        <div 
          ref={leftEyeRef} 
          className="absolute top-[38%] left-[22%] w-[16%] h-[20%] bg-white flex items-center justify-center z-0 rounded-full"
        >
          {/* FIX: Increased mobile pupil from w-1.5 to w-2.5 */}
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-[#0a0a0a] rounded-full transition-transform duration-75 ease-out" />
        </div>

        {/* 3. RIGHT EYE TRACKER */}
        <div 
          ref={rightEyeRef} 
          className="absolute top-[38%] left-[47%] w-[16%] h-[20%] bg-white flex items-center justify-center z-0 rounded-full"
        >
          {/* FIX: Increased mobile pupil from w-1.5 to w-2.5 */}
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-[#0a0a0a] rounded-full transition-transform duration-75 ease-out" />
        </div>

      </div>

      {/* --- UPGRADED BRAND TEXT --- */}
      <div className="text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-md">
        <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">
          z
        </span>
        <span className="text-white">
          Quab
        </span>
      </div>

    </div>
  );
};