import { Globe } from 'lucide-react';

const GlobalLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center font-sans">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 flex flex-col items-center">
        
        {/* Pulsing Logo */}
        <div className="relative mb-8">
           <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 animate-pulse rounded-full"></div>
           <div className="relative w-24 h-24 bg-[#0a0a0a] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
              <Globe className="w-10 h-10 text-blue-500 animate-spin-slow" style={{ animationDuration: '3s' }} />
           </div>
           
           {/* Satellite Orb */}
           <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
           <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-black"></div>
        </div>

        {/* Text */}
        <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">
          Social<span className="text-blue-500">Hub</span>
        </h1>
        <p className="text-xs text-gray-500 font-mono animate-pulse uppercase tracking-widest">
          Establishing Secure Connection...
        </p>

        {/* Loading Bar */}
        <div className="w-48 h-1 bg-gray-800 rounded-full mt-8 overflow-hidden relative">
           <div className="absolute inset-y-0 left-0 bg-blue-600 w-1/2 rounded-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-blue-400 to-transparent translate-x-[-100%]"></div>
        </div>

      </div>
    </div>
  );
};

export default GlobalLoader;