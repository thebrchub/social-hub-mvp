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

        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);

        const maxRadius = rect.width / 4; 
        const distanceToMouse = Math.hypot(e.clientX - eyeCenterX, e.clientY - eyeCenterY);
        const distance = Math.min(distanceToMouse / 15, maxRadius); 

        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        pupil.style.transform = `translate(${x}px, ${y}px)`;
      };

      requestAnimationFrame(() => {
        moveEye(leftEyeRef.current);
        moveEye(rightEyeRef.current);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative w-28 h-28 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center group drop-shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-float">
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
        <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-[#0a0a0a] rounded-full transition-transform duration-75 ease-out" />
      </div>

      {/* 3. RIGHT EYE TRACKER */}
      <div 
        ref={rightEyeRef} 
        className="absolute top-[38%] left-[47%] w-[16%] h-[20%] bg-white flex items-center justify-center z-0 rounded-full"
      >
        <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-[#0a0a0a] rounded-full transition-transform duration-75 ease-out" />
      </div>
    </div>
  );
};