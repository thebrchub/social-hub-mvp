const GlobalLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center font-sans">
      
      {/* --- LAYER 1: Background Grid --- */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a/80] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center">
        
        {/* --- LAYER 2: Pulsing Logo --- */}
        <div className="relative mb-6 flex justify-center items-center">
           
           {/* Pure blue glow directly behind the image */}
           <div className="absolute w-20 h-20 sm:w-28 sm:h-28 bg-blue-600 rounded-full blur-[40px] opacity-40 animate-pulse"></div>
           
           {/* Logo container - Completely transparent */}
           <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center z-10">
             <img 
               src="/logo.png" 
               alt="zQuab Logo" 
               className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse"
               onError={(e) => {
                 e.currentTarget.style.display = 'none';
                 e.currentTarget.nextElementSibling?.classList.remove('hidden');
               }}
             />
             {/* Fallback Z */}
             <span className="hidden text-6xl sm:text-7xl font-black text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse">Z</span>
           </div>
           
           {/* Satellite Orb - Orbiting effect */}
           <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
           <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#0a0a0a]"></div>
        </div>

        {/* --- LAYER 3: Text --- */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display mb-3">
          z<span className="text-blue-500">Quab</span>
        </h1>
        <p className="text-[10px] sm:text-xs text-gray-500 font-mono animate-pulse uppercase tracking-[0.2em]">
          Establishing Secure Connection...
        </p>

        {/* --- LAYER 4: Loading Bar --- */}
        <div className="w-48 sm:w-56 h-1 bg-gray-800 rounded-full mt-10 overflow-hidden relative shadow-[0_0_10px_rgba(0,0,0,0.5)]">
           {/* Using your custom shimmer animation class, updated to blue gradients */}
           <div className="absolute inset-y-0 left-0 w-1/2 rounded-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-blue-500 to-transparent translate-x-[-100%] drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
        </div>

      </div>
    </div>
  );
};

export default GlobalLoader;