import { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Heart, Trophy, Medal, CreditCard, Sparkles, Loader2, History, ShieldCheck } from 'lucide-react';
import Modal from '../components/Modal';

// Mock types based on standard backend structures
interface LeaderboardEntry { id: string; name: string; username: string; avatar_url: string; amount: number; badge: string; }
interface DonationHistory { id: string; amount: number; created_at: string; status: string; }
interface BadgeTier { id: string; name: string; threshold: number; color: string; }

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

const Donations = () => {
  const { user } = useAuthStore();
  
  const [amount, setAmount] = useState<number | ''>('');
  const [leaderboardScope, setLeaderboardScope] = useState<'alltime' | 'monthly'>('alltime');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<DonationHistory[]>([]);
  const [badges, setBadges] = useState<BadgeTier[]>([]);
  
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [boardRes, historyRes, badgesRes] = await Promise.all([
          api.get(`/leaderboard?scope=${leaderboardScope}&limit=10`).catch(() => []),
          api.get('/donate/history?limit=5').catch(() => []),
          api.get('/badges/tiers').catch(() => [])
        ]);

        setLeaderboard(Array.isArray(boardRes) ? boardRes : boardRes?.data || []);
        setHistory(Array.isArray(historyRes) ? historyRes : historyRes?.data || []);
        setBadges(Array.isArray(badgesRes) ? badgesRes : badgesRes?.data || []);
      } catch (error) {
        console.error("Failed to fetch donation data", error);
      } finally {
        setIsLoadingBoard(false);
      }
    };
    fetchData();
  }, [leaderboardScope]);

  const handleDonate = async () => {
    if (!amount || amount < 1) return;
    setIsProcessing(true);

    try {
      const res = await api.post('/donate', { amount: Number(amount), currency: 'INR' });
      console.log("Razorpay Order Created:", res);
      
      // Simulate Razorpay successful flow for now
      setTimeout(() => {
        setIsProcessing(false);
        setShowSuccessModal(true);
        setAmount('');
      }, 1500);

    } catch (error: any) {
      alert(error.message || "Failed to initialize payment");
      setIsProcessing(false);
    }
  };

  // STANDARD DATE FORMAT: 07 March, 2026
  const formatDate = (isoString: string) => {
    if (!isoString) return 'Recently';
    return new Date(isoString).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#030303] scrollbar-hide pb-24 md:pb-12 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pt-8 sm:pt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* --- HERO HEADER --- */}
          <div className="flex flex-col items-center text-center mb-10 sm:mb-14">
             <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-50 dark:bg-[#1E3A8A] rounded-[2rem] flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_10px_30px_rgba(37,99,235,0.2)] border border-blue-200 dark:border-[#1E40AF] relative transition-colors">
                <Heart size={36} strokeWidth={2.5} className="fill-blue-600 dark:fill-blue-500 animate-pulse" />
                <div className="absolute -top-2 -right-2 text-yellow-500 animate-bounce"><Sparkles size={20} strokeWidth={2.5} /></div>
             </div>
             <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display mb-3 transition-colors">
               Support <span className="text-blue-600 dark:text-blue-500">zQuab</span>
             </h1>
             <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base max-w-xl leading-relaxed font-medium transition-colors">
               Your contributions help us maintain the platform, fund exciting new features in zQuab Labs, and unlock exclusive supporter badges for your profile!
             </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
             
             {/* --- LEFT COLUMN: DONATION BOX & HISTORY --- */}
             <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-8">
                
                {/* Donate Card */}
                <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[2rem] p-6 sm:p-8 shadow-sm relative overflow-hidden group transition-colors">
                   <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                   
                   <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-6 transition-colors">
                      <CreditCard className="text-blue-600 dark:text-blue-500" strokeWidth={2.5} /> Make a Contribution
                   </h2>

                   {/* Presets - 3D Bulge */}
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {PRESET_AMOUNTS.map((preset) => (
                         <button 
                           key={preset}
                           onClick={() => setAmount(preset)}
                           className={`py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                             amount === preset 
                             ? 'bg-blue-600 dark:bg-[#1E3A8A] border-blue-500 dark:border-[#1E40AF] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_10px_rgba(0,0,0,0.4)] scale-105' 
                             : 'bg-gray-50 dark:bg-[#0a0a0a] border-gray-200 dark:border-[#272729] text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-[#111] hover:text-gray-900 dark:hover:text-white shadow-sm'
                           }`}
                         >
                           ₹{preset}
                         </button>
                      ))}
                   </div>

                   {/* Custom Amount */}
                   <div className="relative mb-8">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-lg">₹</span>
                      <input 
                         type="number" 
                         value={amount}
                         onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                         placeholder="Enter custom amount"
                         className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#343536] rounded-2xl pl-12 pr-4 py-4 text-gray-900 dark:text-white font-extrabold focus:outline-none focus:bg-white dark:focus:bg-[#111] focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                      />
                   </div>

                   {/* Action Button - Massive 3D Bulge */}
                   <button 
                     onClick={handleDonate}
                     disabled={!amount || amount < 1 || isProcessing}
                     className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-900 dark:disabled:hover:bg-white rounded-2xl font-extrabold transition-all flex items-center justify-center gap-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),_0_6px_15px_rgba(0,0,0,0.2)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),_0_6px_15px_rgba(255,255,255,0.1)] hover:-translate-y-0.5"
                   >
                     {isProcessing ? <Loader2 size={20} className="animate-spin" strokeWidth={2.5} /> : <Heart size={20} strokeWidth={2.5} className="fill-white dark:fill-black" />}
                     {isProcessing ? 'Processing securely...' : `Donate ${amount ? '₹' + amount : ''}`}
                   </button>
                   <p className="text-center text-[10px] text-gray-500 dark:text-gray-400 mt-5 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors">
                      <ShieldCheck size={14} strokeWidth={2.5} className="text-green-500" /> Secured by Razorpay
                   </p>
                </div>

                {/* Personal History */}
                <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[2rem] p-6 sm:p-8 shadow-sm transition-colors">
                   <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-5 uppercase tracking-widest transition-colors">
                      <History size={18} className="text-gray-400 dark:text-gray-500" strokeWidth={2.5} /> My History
                   </h3>
                   {history.length > 0 ? (
                      <div className="space-y-3">
                         {history.map((record) => (
                            <div key={record.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-[#272729] transition-colors">
                               <div>
                                  <p className="text-base font-extrabold text-gray-900 dark:text-white">₹{record.amount}</p>
                                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-widest">{formatDate(record.created_at)}</p>
                               </div>
                               <span className="text-[10px] font-extrabold uppercase tracking-widest text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-900/30 shadow-sm">
                                  {record.status}
                               </span>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="flex flex-col items-center justify-center py-6 bg-gray-50 dark:bg-[#0a0a0a] rounded-2xl border-2 border-dashed border-gray-200 dark:border-[#272729] transition-colors">
                         <p className="text-xs font-bold text-gray-500 dark:text-gray-400">No donations yet.</p>
                         <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-1">Be the first to grab a badge!</p>
                      </div>
                   )}
                </div>
             </div>

             {/* --- RIGHT COLUMN: LEADERBOARD & PERKS --- */}
             <div className="lg:col-span-5 flex flex-col gap-6 sm:gap-8">
                
                {/* Leaderboard */}
                <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[2rem] p-6 sm:p-8 shadow-sm flex flex-col max-h-[550px] transition-colors">
                   <div className="flex items-center justify-between mb-6 shrink-0">
                      <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2 transition-colors">
                         <Trophy className="text-yellow-500" strokeWidth={2.5} /> Top Donors
                      </h2>
                   </div>

                   {/* Toggle Tabs - 3D Bulge */}
                   <div className="flex bg-gray-100 dark:bg-[#0a0a0a] p-1 rounded-xl border border-gray-200 dark:border-[#272729] mb-6 shrink-0 shadow-inner transition-colors">
                      <button 
                         onClick={() => setLeaderboardScope('alltime')}
                         className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all shadow-sm ${leaderboardScope === 'alltime' ? 'bg-white dark:bg-[#272729] text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shadow-none'}`}
                      >
                         All Time
                      </button>
                      <button 
                         onClick={() => setLeaderboardScope('monthly')}
                         className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all shadow-sm ${leaderboardScope === 'monthly' ? 'bg-white dark:bg-[#272729] text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shadow-none'}`}
                      >
                         Monthly
                      </button>
                   </div>

                   {/* Leaderboard List */}
                   <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-1">
                      {isLoadingBoard ? (
                         <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" strokeWidth={3} /></div>
                      ) : leaderboard.length > 0 ? (
                         leaderboard.map((donor, idx) => (
                            <div key={donor.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-[#272729] hover:border-gray-300 dark:hover:border-[#343536] transition-colors relative overflow-hidden group shrink-0">
                               {/* Rank Medals for top 3 */}
                               {idx === 0 && <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-400"></div>}
                               {idx === 1 && <div className="absolute top-0 left-0 w-1.5 h-full bg-gray-300"></div>}
                               {idx === 2 && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-600"></div>}

                               <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 ml-1.5 border border-gray-300 dark:border-[#343536]">
                                  <img src={donor.avatar_url || `https://ui-avatars.com/api/?name=${donor.name}&background=random`} alt={donor.name} className="w-full h-full object-cover" />
                               </div>
                               <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white truncate flex items-center gap-1.5 transition-colors">
                                     {donor.name} 
                                     {idx === 0 && <Medal size={14} className="text-yellow-500 shrink-0" strokeWidth={2.5} />}
                                  </h4>
                                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate mt-0.5">@{donor.username}</p>
                               </div>
                               <div className="text-right shrink-0">
                                  <p className="text-sm font-extrabold text-green-600 dark:text-green-500">₹{donor.amount}</p>
                                  <p className="text-[8px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 px-2 py-1 rounded-md mt-1 inline-block shadow-sm border border-blue-200 dark:border-blue-900/30">
                                     {donor.badge || 'Supporter'}
                                  </p>
                               </div>
                            </div>
                         ))
                      ) : (
                         <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4 shadow-inner">
                               <Trophy size={24} strokeWidth={2.5} />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">No donors yet.</p>
                            <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-widest">Be the first to claim the top spot!</p>
                         </div>
                      )}
                   </div>
                </div>

                {/* --- DISPLAY UNLOCKABLE BADGES --- */}
                {badges.length > 0 && (
                   <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[2rem] p-6 sm:p-8 shadow-sm transition-colors">
                      <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-5 uppercase tracking-widest transition-colors">
                         <Medal size={18} className="text-yellow-500" strokeWidth={2.5} /> Unlockable Badges
                      </h3>
                      <div className="flex flex-wrap gap-2.5">
                         {badges.map((badge) => (
                            <div key={badge.id} className="flex items-center gap-2.5 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#343536] px-3.5 py-2.5 rounded-xl shadow-sm transition-colors">
                               <ShieldCheck size={18} strokeWidth={2.5} style={{ color: badge.color || '#3b82f6' }} />
                               <div>
                                  <p className="text-xs font-extrabold text-gray-900 dark:text-white leading-tight transition-colors">{badge.name}</p>
                                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">₹{badge.threshold}+</p>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                )}

             </div>
          </div>
        </div>
      </div>

      {/* --- SUCCESS MODAL --- */}
      <Modal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
        title="Payment Successful"
        footer={
          <button onClick={() => setShowSuccessModal(false)} className="w-full py-3.5 bg-blue-600 dark:bg-[#1E3A8A] border border-blue-700 dark:border-[#1E40AF] text-white font-extrabold rounded-2xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_10px_rgba(0,0,0,0.4)] hover:-translate-y-0.5">
            Awesome!
          </button>
        }
      >
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/20 rounded-full flex items-center justify-center mb-5 shadow-inner border border-blue-100 dark:border-blue-500/20">
            <Heart size={40} className="fill-blue-600 dark:fill-blue-500 text-blue-600 dark:text-blue-500" strokeWidth={2.5} />
          </div>
          <h4 className="text-xl font-display font-extrabold text-gray-900 dark:text-white mb-2">Thank you, {user?.name?.split(' ')[0] || 'friend'}!</h4>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Your contribution helps keep zQuab alive. Your profile badge will be updated shortly.</p>
        </div>
      </Modal>

    </DashboardLayout>
  );
};

export default Donations;