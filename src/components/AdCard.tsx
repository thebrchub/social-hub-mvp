import { ExternalLink } from 'lucide-react';

const AdCard = () => {
  return (
    <div className="w-full bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 rounded-xl p-4 mt-4 relative overflow-hidden group cursor-pointer">
      {/* "Sponsored" Label */}
      <div className="absolute top-2 right-2 text-[10px] uppercase tracking-widest text-indigo-400 font-bold opacity-60">
        Promoted
      </div>

      <div className="flex flex-col gap-2">
        {/* Ad Image / Icon */}
        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
          ⚡
        </div>
        
        <div>
          <h4 className="text-white font-display font-bold text-sm">Pro Gamer Headset</h4>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            Hear every footstep. Discount valid for 2 hours.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-2 flex items-center gap-2 text-indigo-300 text-xs font-medium group-hover:text-white transition-colors">
          Shop Now <ExternalLink className="w-3 h-3" />
        </div>
      </div>
      
      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
    </div>
  );
};

export default AdCard;