import { AlertTriangle, X, Check } from 'lucide-react';
import { useState } from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

const ReportModal = ({ isOpen, onClose, username }: ReportModalProps) => {
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    setSubmitted(true);
    // Here you would send API request
    setTimeout(() => {
        setSubmitted(false);
        onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
       {/* Backdrop */}
       <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

       {/* Modal */}
       <div className="relative bg-[#1a1a1a] border border-red-500/20 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in duration-200">
          
          {!submitted ? (
            <>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 text-red-500">
                        <div className="bg-red-500/10 p-2 rounded-lg">
                            <AlertTriangle size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Report User</h2>
                    </div>
                    <button onClick={onClose}><X className="text-gray-500 hover:text-white"/></button>
                </div>
                
                <p className="text-gray-400 text-sm mb-6">
                    Why are you reporting <span className="text-white font-bold">{username}</span>? This is anonymous.
                </p>

                <div className="space-y-2 mb-6">
                    {['Nudity or Sexual Content', 'Harassment or Bullying', 'Spam or Scam', 'Hate Speech'].map((reason) => (
                        <button key={reason} className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors focus:bg-red-500/20 focus:text-red-400 focus:border-red-500/50 border border-transparent">
                            {reason}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5">Cancel</button>
                    <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">Submit Report</button>
                </div>
            </>
          ) : (
            <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Report Received</h3>
                <p className="text-gray-400 text-sm">We will review this within 24 hours.</p>
            </div>
          )}

       </div>
    </div>
  );
};

export default ReportModal;