import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import { Users, Loader2, ArrowRight, ShieldCheck, XCircle } from 'lucide-react';
import { InteractiveLogo } from '../components/InteractiveLogo';

export default function JoinGroup() {
  const { code } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AUTH CHECK: If they are not logged in, save the URL and redirect to login
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('zquab_return_to', `/j/${code}`);
      navigate('/login');
    }
  }, [isAuthenticated, code, navigate]);

  const handleJoin = async () => {
    if (!code) return;
    setIsJoining(true);
    setError(null);
    try {
      const res = await api.post(`/invite/${code}`);
      const data = res.data || res;
      const roomId = data.room_id || data.id || data.groupId;
      
      // Successfully joined! Route them straight to the chat and open the room
      navigate('/chats', { state: { autoOpenRoomId: roomId } });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to join squad.";
      if (msg.toLowerCase().includes('already')) {
         // If they are already in the group, just take them to chats
         navigate('/chats');
      } else {
         setError(msg);
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Prevent UI flash before redirecting unauthenticated users
  if (!isAuthenticated) return null; 

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#030303] text-gray-900 dark:text-white p-4 font-sans selection:bg-blue-500/30 relative overflow-hidden transition-colors duration-300">
        
        {/* Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="z-10 w-full max-w-md bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#272729] rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 fade-in duration-300">
            <div className="mb-6 scale-75">
                <InteractiveLogo />
            </div>

            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-500 mb-6 shadow-inner border border-blue-100 dark:border-blue-500/20">
               <Users size={32} strokeWidth={2.5} />
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">You've been invited!</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 text-sm px-4">
                Someone shared a magic link with you to join their squad on zQuab.
            </p>

            {error && (
               <div className="w-full p-4 mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold text-left animate-in shake">
                  <XCircle size={20} className="shrink-0" />
                  <p>{error}</p>
               </div>
            )}

            <div className="w-full flex flex-col gap-3">
                <button 
                   onClick={handleJoin} 
                   disabled={isJoining}
                   className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-extrabold transition-all flex items-center justify-center gap-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_8px_16px_rgba(37,99,235,0.2)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                    {isJoining ? <Loader2 size={20} className="animate-spin" strokeWidth={3} /> : 'Accept & Join Squad'}
                    {!isJoining && <ArrowRight size={18} strokeWidth={3} />}
                </button>
                <button 
                   onClick={() => navigate('/dashboard')}
                   disabled={isJoining}
                   className="w-full py-4 bg-gray-50 dark:bg-[#0a0a0a] hover:bg-gray-100 dark:hover:bg-[#272729] text-gray-600 dark:text-gray-400 rounded-2xl font-extrabold transition-all border border-gray-200 dark:border-[#272729]"
                >
                    Go to Dashboard
                </button>
            </div>

            <div className="mt-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-500 opacity-80">
                <ShieldCheck size={14} /> Secure zQuab Invite
            </div>
        </div>
    </div>
  );
}