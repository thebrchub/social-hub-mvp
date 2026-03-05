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
  
  // States
  const [amount, setAmount] = useState<number | ''>('');
  const [leaderboardScope, setLeaderboardScope] = useState<'alltime' | 'monthly'>('alltime');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<DonationHistory[]>([]);
  const [badges, setBadges] = useState<BadgeTier[]>([]);
  
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch Data
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

  // Handle Donation (Razorpay trigger goes here)
  const handleDonate = async () => {
    if (!amount || amount < 1) return;
    setIsProcessing(true);

    try {
      // 1. Hit your backend to create an order / process donation
      const res = await api.post('/donate', { amount: Number(amount), currency: 'INR' });
      
      // TS FIX: Logging the response clears the warning and helps you debug Razorpay order IDs later!
      console.log("Razorpay Order Created:", res);
      
      // NOTE: Normally, you would trigger the Razorpay SDK popup here using the order ID from the response.
      // For now, we simulate a successful payment flow.
      setTimeout(() => {
        setIsProcessing(false);
        setShowSuccessModal(true);
        setAmount('');
        // Re-fetch history and leaderboard after successful donation
      }, 1500);

    } catch (error: any) {
      alert(error.message || "Failed to initialize payment");
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-[#0a0a0a] scrollbar-hide pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* --- HERO HEADER --- */}
          <div className="flex flex-col items-center text-center mb-10 sm:mb-12">
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-500 mb-4 sm:mb-6 shadow-[0_0_40px_rgba(59,130,246,0.3)] relative">
                <Heart size={32} className="sm:w-10 sm:h-10 fill-blue-500 animate-pulse" />
                <div className="absolute top-0 right-0 text-yellow-400 animate-bounce"><Sparkles size={16} /></div>
             </div>
             <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display mb-3">
               Support <span className="text-blue-500">zQuab</span>
             </h1>
             <p className="text-gray-400 text-sm sm:text-base max-w-xl leading-relaxed">
               Your contributions help us maintain the platform, fund exciting new features in zQuab Labs, and unlock exclusive supporter badges for your profile!
             </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
             
             {/* --- LEFT COLUMN: DONATION BOX & HISTORY --- */}
             <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-8">
                
                {/* Donate Card */}
                <div className="bg-[#1A1A1B] border border-[#343536] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                   
                   <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                      <CreditCard className="text-blue-500" /> Make a Contribution
                   </h2>

                   {/* Presets */}
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {PRESET_AMOUNTS.map((preset) => (
                         <button 
                           key={preset}
                           onClick={() => setAmount(preset)}
                           className={`py-3 rounded-xl font-bold text-sm transition-all border ${
                             amount === preset 
                             ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                             : 'bg-[#0a0a0a] border-[#272729] text-gray-300 hover:border-gray-500'
                           }`}
                         >
                           ₹{preset}
                         </button>
                      ))}
                   </div>

                   {/* Custom Amount */}
                   <div className="relative mb-8">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                      <input 
                         type="number" 
                         value={amount}
                         onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                         placeholder="Enter custom amount"
                         className="w-full bg-[#0a0a0a] border border-[#343536] rounded-xl pl-10 pr-4 py-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                      />
                   </div>

                   {/* Action Button */}
                   <button 
                     onClick={handleDonate}
                     disabled={!amount || amount < 1 || isProcessing}
                     className="w-full py-4 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                   >
                     {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Heart size={20} className="fill-black" />}
                     {isProcessing ? 'Processing...' : `Donate ${amount ? '₹' + amount : ''}`}
                   </button>
                   <p className="text-center text-[10px] text-gray-500 mt-4 uppercase tracking-widest flex items-center justify-center gap-1">
                      <ShieldCheck size={12} /> Secured by Razorpay
                   </p>
                </div>

                {/* Personal History */}
                <div className="bg-[#1A1A1B] border border-[#272729] rounded-3xl p-6">
                   <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                      <History size={16} className="text-gray-400" /> My History
                   </h3>
                   {history.length > 0 ? (
                      <div className="space-y-3">
                         {history.map((record) => (
                            <div key={record.id} className="flex justify-between items-center p-3 bg-[#0a0a0a] rounded-xl border border-[#272729]">
                               <div>
                                  <p className="text-sm font-bold text-white">₹{record.amount}</p>
                                  <p className="text-[10px] text-gray-500">{new Date(record.created_at).toLocaleDateString()}</p>
                               </div>
                               <span className="text-[10px] font-bold uppercase tracking-wider text-green-500 bg-green-500/10 px-2 py-1 rounded">
                                  {record.status}
                               </span>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <p className="text-xs text-gray-500 text-center py-4 bg-[#0a0a0a] rounded-xl border border-dashed border-[#272729]">
                         No donations yet. Be the first to grab a badge!
                      </p>
                   )}
                </div>
             </div>

             {/* --- RIGHT COLUMN: LEADERBOARD & PERKS --- */}
             <div className="lg:col-span-5 flex flex-col gap-6 sm:gap-8">
                
                {/* Leaderboard */}
                <div className="bg-[#1A1A1B] border border-[#343536] rounded-3xl p-6 shadow-xl flex flex-col max-h-[500px]">
                   <div className="flex items-center justify-between mb-6 shrink-0">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                         <Trophy className="text-yellow-500" /> Top Donors
                      </h2>
                   </div>

                   {/* Toggle Tabs */}
                   <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-[#272729] mb-6 shrink-0">
                      <button 
                         onClick={() => setLeaderboardScope('alltime')}
                         className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${leaderboardScope === 'alltime' ? 'bg-[#272729] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                         All Time
                      </button>
                      <button 
                         onClick={() => setLeaderboardScope('monthly')}
                         className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${leaderboardScope === 'monthly' ? 'bg-[#272729] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                         Monthly
                      </button>
                   </div>

                   {/* Leaderboard List */}
                   <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-1">
                      {isLoadingBoard ? (
                         <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-gray-500 animate-spin" /></div>
                      ) : leaderboard.length > 0 ? (
                         leaderboard.map((donor, idx) => (
                            <div key={donor.id} className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-xl border border-[#272729] hover:border-[#343536] transition-colors relative overflow-hidden group shrink-0">
                               {/* Rank Medals for top 3 */}
                               {idx === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>}
                               {idx === 1 && <div className="absolute top-0 left-0 w-1 h-full bg-gray-300"></div>}
                               {idx === 2 && <div className="absolute top-0 left-0 w-1 h-full bg-amber-700"></div>}

                               <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden shrink-0 ml-1">
                                  <img src={donor.avatar_url || `https://ui-avatars.com/api/?name=${donor.name}&background=random`} alt={donor.name} className="w-full h-full object-cover" />
                               </div>
                               <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-bold text-white truncate flex items-center gap-1">
                                     {donor.name} 
                                     {idx === 0 && <Medal size={14} className="text-yellow-400 shrink-0" />}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 truncate">@{donor.username}</p>
                               </div>
                               <div className="text-right shrink-0">
                                  <p className="text-sm font-bold text-green-400">₹{donor.amount}</p>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                                     {donor.badge || 'Supporter'}
                                  </p>
                               </div>
                            </div>
                         ))
                      ) : (
                         <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-600 mb-3">
                               <Trophy size={20} />
                            </div>
                            <p className="text-sm text-gray-400 font-medium">No donors yet.</p>
                            <p className="text-xs text-gray-600">Be the first to claim the top spot!</p>
                         </div>
                      )}
                   </div>
                </div>

                {/* --- TS FIX: DISPLAY UNLOCKABLE BADGES --- */}
                {badges.length > 0 && (
                   <div className="bg-[#1A1A1B] border border-[#272729] rounded-3xl p-6">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                         <Medal size={16} className="text-yellow-500" /> Unlockable Badges
                      </h3>
                      <div className="flex flex-wrap gap-2">
                         {badges.map((badge) => (
                            <div key={badge.id} className="flex items-center gap-2 bg-[#0a0a0a] border border-[#343536] px-3 py-2 rounded-xl">
                               {/* Inject dynamic color if backend provides it, otherwise use blue */}
                               <ShieldCheck size={16} style={{ color: badge.color || '#3b82f6' }} />
                               <div>
                                  <p className="text-xs font-bold text-white leading-tight">{badge.name}</p>
                                  <p className="text-[10px] text-gray-500">₹{badge.threshold}+</p>
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
          <button onClick={() => setShowSuccessModal(false)} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors">
            Awesome!
          </button>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <Heart size={32} className="fill-blue-500" />
          </div>
          <h4 className="text-xl font-bold text-white mb-2">Thank you, {user?.name?.split(' ')[0] || 'friend'}!</h4>
          <p className="text-sm text-gray-400">Your contribution helps keep zQuab alive. Your profile badge will be updated shortly.</p>
        </div>
      </Modal>

    </DashboardLayout>
  );
};

export default Donations;