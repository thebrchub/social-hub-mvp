import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Send, UserPlus, XCircle, RefreshCw, Zap, Smile } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

const Matches = () => {
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'CHATTING'>('IDLE');
  const [messages, setMessages] = useState<{id: number, text: string, isMe: boolean}[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startSearch = () => {
    setStatus('SEARCHING');
    setMessages([]); 
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      setStatus('CHATTING');
      setMessages([{ id: 1, text: "Stranger has connected. Say hi!", isMe: false }]);
    }, 2500);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const newMsg = { id: Date.now(), text: inputValue, isMe: true };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");
    setShowEmojiPicker(false);

    setTimeout(() => {
       setMessages((prev) => [...prev, { id: Date.now()+1, text: "Haha true! Where are you from?", isMe: false }]);
    }, 1500);
  };

  const onEmojiClick = (emojiObject: any) => {
    setInputValue((prev) => prev + emojiObject.emoji);
  };

  const nextMatch = () => {
     setStatus('SEARCHING');
     setMessages([]);
     setShowEmojiPicker(false);
     setTimeout(() => {
       setStatus('CHATTING');
       setMessages([{ id: Date.now(), text: "Stranger connected.", isMe: false }]);
     }, 1500);
  };

  return (
    <DashboardLayout>
      {/* FIX 1: Explicit height calc(100vh - 4rem) to fill remaining screen space exactly */}
      <div className="w-full h-[calc(100vh-4rem)] flex flex-col relative bg-[#0a0a0a]">
        
        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]/50 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <h2 className="text-lg font-display font-bold text-white">Stranger Chat</h2>
          </div>
          <div className="text-xs font-bold text-gray-500">1,240 Online</div>
        </div>

        {/* --- MAIN AREA --- */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* STATE 1: IDLE */}
          {status === 'IDLE' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in">
               <button 
                 onClick={startSearch}
                 className="w-40 h-40 bg-[#0f0f0f] border-2 border-white/10 rounded-full flex items-center justify-center group hover:scale-105 transition-transform cursor-pointer shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]"
               >
                  <Zap className="w-16 h-16 text-blue-500 group-hover:text-white transition-colors" />
               </button>
               <h3 className="mt-8 text-2xl font-display font-bold text-white">Start Texting</h3>
               <p className="text-gray-500 text-sm mt-2 max-w-xs">
                 Connect with random people instantly. No video, just pure conversation.
               </p>
            </div>
          )}

          {/* STATE 2: SEARCHING */}
          {status === 'SEARCHING' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
               <div className="relative w-32 h-32 flex items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500/10 animate-ping"></span>
                  <div className="w-20 h-20 bg-[#0f0f0f] border border-blue-500/30 rounded-full flex items-center justify-center">
                     <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
               </div>
               <h3 className="mt-6 text-lg font-display font-bold text-white animate-pulse">Looking for someone...</h3>
               <button onClick={() => setStatus('IDLE')} className="mt-4 text-xs text-red-400 font-bold hover:underline">Cancel</button>
            </div>
          )}

          {/* STATE 3: CHATTING */}
          {status === 'CHATTING' && (
            <div className="flex-1 flex flex-col w-full h-full relative">
               
               {/* Controls Bar */}
               <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0f0f0f]/50 shrink-0">
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-gray-300">Stranger</span>
                     <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">Typing...</span>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => alert("Friend Request Sent!")} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-green-400 transition-colors" title="Add Friend">
                        <UserPlus size={18} />
                     </button>
                     <button onClick={nextMatch} className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-xs font-bold flex items-center gap-2">
                        <XCircle size={14} /> Skip / Next
                     </button>
                  </div>
               </div>

               {/* Messages Area */}
               <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                  {/* FIX 2: Wrapper to force messages to the bottom */}
                  <div className="min-h-full flex flex-col justify-end space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[70%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                              msg.isMe 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-[#1a1a1a] text-gray-200 border border-white/5 rounded-bl-none'
                           }`}>
                              {msg.text}
                           </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                  </div>
               </div>

               {/* Input Area */}
               <div className="p-4 border-t border-white/5 bg-[#0a0a0a] relative z-20 shrink-0">
                  
                  {/* Emoji Picker Popup */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-20 left-4 z-50 shadow-2xl">
                      <EmojiPicker 
                        theme={Theme.DARK} 
                        onEmojiClick={onEmojiClick}
                        width={350}
                        height={400}
                      />
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
                     
                     {/* Input Wrapper */}
                     <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            autoFocus
                        />
                        {/* Emoji Button (Inside Input) */}
                        <button 
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
                        >
                          <Smile size={20} />
                        </button>
                     </div>

                     <button type="submit" className="p-3.5 bg-blue-600 rounded-xl text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20" disabled={!inputValue.trim()}>
                        <Send size={20} />
                     </button>
                  </form>
               </div>

            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Matches;