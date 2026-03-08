import { ExternalLink } from 'lucide-react';

const AdCard = () => {
  return (
    <div className="w-full bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-900/40 dark:to-slate-900/40 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-4 mt-4 relative overflow-hidden group cursor-pointer transition-colors duration-300 shadow-sm">
      
      {/* "Sponsored" Label */}
      <div className="absolute top-3 right-3 text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-extrabold opacity-80 dark:opacity-60 transition-colors">
        Promoted
      </div>

      <div className="flex flex-col gap-3">
        {/* Ad Image / Icon */}
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30 dark:shadow-indigo-500/20 group-hover:scale-105 group-hover:-rotate-3 transition-all duration-300">
          ⚡
        </div>
        
        <div>
          <h4 className="text-slate-900 dark:text-white font-display font-bold text-sm transition-colors">Pro Gamer Headset</h4>
          <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed font-medium transition-colors">
            Hear every footstep. Discount valid for 2 hours.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-1 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-300 text-xs font-bold group-hover:text-indigo-800 dark:group-hover:text-white transition-colors">
          Shop Now <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>
      </div>
      
      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
    </div>
  );
};

export default AdCard;