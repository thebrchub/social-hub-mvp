import { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Search, MoreVertical, Send, ArrowLeft, Paperclip, Smile, Hash, Users, Plus } from 'lucide-react';

// --- MOCK DATA ---
const CHANNELS = [
  { id: 101, name: "bangalore-techies", type: 'channel', members: 1240, unread: 5 },
  { id: 102, name: "movie-club", type: 'channel', members: 85, unread: 0 },
  { id: 103, name: "general-chat", type: 'channel', members: 450, unread: 0 },
];

const DIRECT_MSGS = [
  { id: 1, name: "Anjali Sharma", type: 'dm', lastMsg: "See you at 8 PM! 🎬", time: "10:30 AM", unread: 2, online: true, avatar: "A" },
  { id: 2, name: "Rahul Dev", type: 'dm', lastMsg: "Bro, check the PR 💻", time: "Yesterday", unread: 0, online: false, avatar: "R" },
  { id: 3, name: "Sarah K.", type: 'dm', lastMsg: "Sent photos.", time: "Yesterday", unread: 0, online: true, avatar: "S" },
];

const MOCK_MESSAGES = [
  { id: 1, text: "Hey everyone! Anyone up for a meet this weekend?", isMe: false, sender: "Rahul Dev", time: "10:28 AM", color: "text-red-400" },
  { id: 2, text: "I'm down! Let's go to Indiranagar.", isMe: true, sender: "Me", time: "10:29 AM", color: "text-blue-400" },
  { id: 3, text: "Count me in too! 🚀", isMe: false, sender: "Anjali S.", time: "10:30 AM", color: "text-green-400" },
  { id: 4, text: "Great! Let's meet at Toit?", isMe: false, sender: "Rahul Dev", time: "10:31 AM", color: "text-red-400" },
];

const Chats = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeType, setActiveType] = useState<'channel' | 'dm' | null>(null);
  const [inputValue, setInputValue] = useState("");

  const handleSelect = (id: number, type: 'channel' | 'dm') => {
    setSelectedId(id);
    setActiveType(type);
  };

  // Find active chat data based on ID and Type
  const activeChat = activeType === 'channel' 
    ? CHANNELS.find(c => c.id === selectedId) 
    : DIRECT_MSGS.find(c => c.id === selectedId);

  return (
    <DashboardLayout>
      {/* FIX: h-[calc(100vh-4rem)] forces this container to be exactly the height of the viewport 
         minus the 64px (4rem) header. This guarantees it touches the bottom edge.
      */}
      <div className="w-full h-[calc(100vh-4rem)] flex bg-[#0a0a0a] overflow-hidden relative font-sans">
        
        {/* --- LEFT SIDEBAR --- */}
        <div className={`w-full md:w-80 border-r border-white/5 flex flex-col bg-[#0f0f0f] ${selectedId ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header */}
          <div className="p-4 border-b border-white/5 shadow-sm z-10 shrink-0">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-display font-bold text-white tracking-wide">Discussions</h2>
                <button className="bg-white/5 text-gray-400 p-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors">
                    <Plus size={18} />
                </button>
             </div>
             <div className="relative group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Find conversation..."
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-600"
                />
             </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-6">
             
             {/* CHANNELS */}
             <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2 flex justify-between group cursor-pointer hover:text-gray-300">
                    Community Rooms <span>+</span>
                </h3>
                <div className="space-y-0.5">
                    {CHANNELS.map((channel) => (
                        <div 
                            key={channel.id}
                            onClick={() => handleSelect(channel.id, 'channel')}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group transition-all ${selectedId === channel.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Hash size={18} className="text-gray-500 group-hover:text-gray-400" />
                                <span className="text-sm font-medium truncate max-w-[150px]">{channel.name}</span>
                            </div>
                            {channel.unread > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full min-w-[18px] text-center">{channel.unread}</span>
                            )}
                        </div>
                    ))}
                </div>
             </div>

             {/* DIRECT MESSAGES */}
             <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">Direct Messages</h3>
                <div className="space-y-1">
                    {DIRECT_MSGS.map((dm) => (
                        <div 
                            key={dm.id}
                            onClick={() => handleSelect(dm.id, 'dm')}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${selectedId === dm.id ? 'bg-blue-600/10 border border-blue-600/20' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className="relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${selectedId === dm.id ? 'bg-blue-600' : 'bg-[#2a2a2a]'}`}>
                                    {dm.avatar}
                                </div>
                                {dm.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#0f0f0f] rounded-full"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <span className={`text-sm font-medium truncate ${selectedId === dm.id ? 'text-blue-400' : 'text-gray-300'}`}>{dm.name}</span>
                                    {dm.unread > 0 && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>

          </div>
        </div>

        {/* --- RIGHT AREA (Chat View) --- */}
        <div className={`flex-1 flex flex-col bg-[#0a0a0a] relative ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
           
           {selectedId ? (
              <>
                {/* Header - Absolute to float over content */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-[#0f0f0f]/80 backdrop-blur-md z-20 absolute top-0 left-0 right-0">
                   <div className="flex items-center gap-3">
                      {/* Back Button (Mobile) */}
                      <button onClick={() => setSelectedId(null)} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white">
                        <ArrowLeft size={20} />
                      </button>
                      
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-300">
                         {activeType === 'channel' ? <Hash size={18} /> : <span className="font-bold">{(activeChat as any).avatar}</span>}
                      </div>

                      <div>
                         <h3 className="font-bold text-white text-sm flex items-center gap-2">
                            {activeChat?.name} 
                            {activeType === 'channel' && <span className="text-[10px] border border-white/10 px-1.5 py-0.5 rounded text-gray-400 font-normal">Public</span>}
                         </h3>
                         <span className="text-xs text-gray-500 flex items-center gap-1">
                            {activeType === 'channel' 
                                ? <><Users size={10} /> {(activeChat as any).members} members</> 
                                : (activeChat as any).online ? '● Online' : 'Offline'
                            }
                         </span>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-4 text-gray-400">
                      <Search size={18} className="hover:text-white cursor-pointer" />
                      <MoreVertical size={18} className="hover:text-white cursor-pointer" />
                   </div>
                </div>

                {/* Messages Body */}
                {/* FIX: 
                   1. 'pt-16' adds padding for the absolute header so content isn't hidden.
                   2. 'flex-grow' ensures this takes all available space, pushing the input bar to the bottom.
                   3. 'min-h-0' is crucial for nested flex scrolling to work properly.
                */}
                <div className="flex-grow flex flex-col min-h-0 pt-16 bg-[#0a0a0a]">
                    
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-4 md:px-6 pb-4 flex flex-col justify-end">
                       
                       {/* Welcome Message */}
                       <div className="mb-8 text-center md:text-left opacity-50 hover:opacity-100 transition-opacity mt-4">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0">
                             <Hash size={32} className="text-gray-500" />
                          </div>
                          <h1 className="text-2xl font-bold text-white mb-2">Welcome to #{activeChat?.name}!</h1>
                          <p className="text-gray-400 text-sm">
                            This is the start of the <span className="font-bold text-gray-300">#{activeChat?.name}</span> channel. 
                          </p>
                       </div>
                       
                       {/* Date Divider */}
                       <div className="relative flex py-5 items-center">
                            <div className="flex-grow border-t border-white/5"></div>
                            <span className="flex-shrink-0 mx-4 text-[10px] font-bold text-gray-600 uppercase">Today</span>
                            <div className="flex-grow border-t border-white/5"></div>
                       </div>

                       {/* Message List */}
                       <div className="flex flex-col gap-2">
                           {MOCK_MESSAGES.map((msg) => (
                               <div key={msg.id} className={`flex gap-3 group px-2 py-1 hover:bg-white/[0.02] rounded-lg -mx-2`}>
                                 {/* Avatar */}
                                 <div className="w-10 h-10 flex-shrink-0">
                                    {!msg.isMe && (
                                       <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white mt-1">
                                           {msg.sender[0]}
                                       </div>
                                    )}
                                    {msg.isMe && (
                                       <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white mt-1">
                                           M
                                       </div>
                                    )}
                                 </div>

                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                       <span className={`text-sm font-bold ${msg.isMe ? 'text-blue-400' : 'text-gray-200'}`}>{msg.sender}</span>
                                       <span className="text-[10px] text-gray-600">{msg.time}</span>
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed break-words">
                                       {msg.text}
                                    </p>
                                 </div>
                               </div>
                           ))}
                       </div>
                    </div>
                </div>

                {/* Input Area */}
                {/* Fixed at the bottom naturally by flex layout */}
                <div className="p-4 px-6 border-t border-white/5 bg-[#0a0a0a] shrink-0">
                   <div className="bg-[#1a1a1a] rounded-xl flex items-center px-4 py-2 border border-white/10 focus-within:border-blue-500/50 transition-colors">
                      <button className="p-2 text-gray-400 hover:text-white transition-colors">
                        <Paperclip size={20} />
                      </button>
                      <input 
                           type="text" 
                           value={inputValue}
                           onChange={(e) => setInputValue(e.target.value)}
                           placeholder={`Message #${activeChat?.name || 'User'}`}
                           className="flex-1 bg-transparent text-white text-sm px-3 py-2 focus:outline-none placeholder:text-gray-600"
                           onKeyDown={(e) => e.key === 'Enter' && setInputValue('')}
                       />
                      <button className="p-2 text-gray-400 hover:text-yellow-400 transition-colors mr-2">
                        <Smile size={20} />
                      </button>
                      {inputValue.trim() && (
                          <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Send size={16} />
                          </button>
                      )}
                   </div>
                </div>
              </>
           ) : (
             // Empty State
             <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                 <div className="w-20 h-20 bg-white/5 rounded-2xl rotate-3 flex items-center justify-center mb-6 animate-pulse">
                    <Hash size={40} className="text-gray-500" />
                 </div>
                 <h3 className="text-2xl font-display font-bold text-white mb-2">Select a Room</h3>
                 <p className="text-sm text-gray-400 max-w-xs">
                   Join a community channel or start a private conversation from the sidebar.
                 </p>
             </div>
           )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Chats;