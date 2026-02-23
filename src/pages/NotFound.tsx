import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden text-center p-6">
       
       {/* Background Decoration */}
       <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"></div>

       <h1 className="text-[150px] font-display font-black text-white/5 leading-none select-none">404</h1>
       
       <div className="relative z-10 -mt-20">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">Lost in Space?</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-8">
            The page you are looking for has drifted away into the void. Let's get you back to safety.
          </p>
          
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2 mx-auto"
          >
            <Home size={20} /> Back to Home
          </button>
       </div>
    </div>
  );
};

export default NotFound;