import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] w-full bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center relative overflow-hidden text-center p-6 transition-colors duration-500">
       
       {/* Background Decoration */}
       <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none transition-colors duration-500"></div>
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-[80px] md:blur-[120px] pointer-events-none animate-pulse"></div>

       {/* Giant Watermark */}
       <h1 className="text-[160px] md:text-[240px] font-display font-black text-gray-200 dark:text-white/5 leading-none select-none drop-shadow-sm dark:drop-shadow-none transition-colors duration-500 z-0">
         404
       </h1>
       
       {/* Content */}
       <div className="relative z-10 -mt-16 md:-mt-24 animate-in slide-in-from-bottom-8 fade-in duration-700">
          <h2 className="text-3xl md:text-5xl font-display font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight transition-colors">Lost in Space?</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-md mx-auto mb-10 font-medium transition-colors">
            The page you are looking for has drifted away into the void. Let's get you back to safety.
          </p>
          
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-8 py-4 bg-blue-600 dark:bg-white text-white dark:text-black font-extrabold rounded-2xl transition-all flex items-center gap-2 mx-auto shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_6px_15px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_0_20px_rgba(255,255,255,0.2)] hover:-translate-y-1"
          >
            <Home size={20} strokeWidth={2.5} /> Back to Home
          </button>
       </div>
    </div>
  );
};

export default NotFound;