import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Save, LogOut, Loader2, User, Eye, ZoomIn,  ZoomOut, Globe, CheckCircle2, Bell, MessageSquare, Heart, Users, AtSign, Upload, Camera, X } from 'lucide-react';
import Modal from '../components/Modal';
import Cropper from 'react-easy-crop'; // <-- Added Cropper

const compressImage = (file: File): Promise<{ blob: Blob, type: string, w: number, h: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      const MAX_DIM = 1080; // DPs don't need to be 1920px, 1080px is plenty for avatars!
      if (w > MAX_DIM || h > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, w, h);
      const outType = 'image/webp';
      canvas.toBlob(blob => {
        if (!blob) return resolve({ blob: file, type: file.type, w: img.naturalWidth, h: img.naturalHeight });
        if (blob.size < file.size) resolve({ blob, type: outType, w, h });
        else resolve({ blob: file, type: file.type, w: img.naturalWidth, h: img.naturalHeight });
      }, outType, 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
};

// --- NEW: Helper to extract the cropped area from the canvas ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<File> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas is empty'));
      resolve(new File([blob], "cropped_avatar.jpg", { type: "image/jpeg" }));
    }, 'image/jpeg', 1);
  });
};

// 8 premium avatar URLs
const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Nala&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jade&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&backgroundColor=d1d4f9",
];

interface NotificationPrefs {
  likes: boolean;
  comments: boolean;
  friend_requests: boolean;
  mentions: boolean;
  dm_messages: boolean;
  group_messages: boolean;
}

const Settings = () => {
  const { user, logout, completeOnboarding } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);

  // --- UPGRADED: Avatar Upload & Preview States ---
  const [pendingAvatar, setPendingAvatar] = useState<{ file: File, previewUrl: string } | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  // --- NEW: Cropper States ---
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Catch the file and open the Preview Modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create a temporary local URL for the preview
    const previewUrl = URL.createObjectURL(file);
    setPendingAvatar({ file, previewUrl });
    
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
  };

  // 2. User confirms the circular crop looks good -> Compress & Upload!
  const handleConfirmAvatarUpload = async () => {
    if (!pendingAvatar || !croppedAreaPixels) return;
    
    setIsUploadingAvatar(true);
    try {
      // 1. EXTRACT THE CROPPED SQUARE
      const croppedFile = await getCroppedImg(pendingAvatar.previewUrl, croppedAreaPixels);

      // 2. Compress the cropped square to WebP
      const { blob, type } = await compressImage(croppedFile);
      const safeFilename = `avatar_${Date.now()}.webp`; 
      
      // 3. Request the presigned URL
      const presignRes = await api.post(`/arena/media/presign`, { filename: safeFilename, contentType: type });
      const presignData = presignRes.data || presignRes;
      
      const actualUploadUrl = presignData.uploadUrl || presignData.presignedUrl || presignData.upload_url || presignData.url;
      if (!actualUploadUrl) throw new Error("Backend did not return a valid upload URL.");

      // 4. BULLETPROOF UPLOAD: Inject Public ACL & Content-Type
      if (presignData.fields) {
        const formDataS3 = new FormData();
        Object.keys(presignData.fields).forEach(key => formDataS3.append(key, presignData.fields[key]));
        
        // 🔥 THE FIX: Force public read permissions!
        if (!presignData.fields.acl) formDataS3.append('acl', 'public-read');
        
        // Force the correct file type and name so Tigris doesn't get confused
        formDataS3.append('Content-Type', type);
        formDataS3.append('file', blob, safeFilename);

        const uploadRes = await fetch(actualUploadUrl, { method: 'POST', body: formDataS3 });
        if (!uploadRes.ok) throw new Error("POST Upload failed with status: " + uploadRes.status);
      } else {
        const uploadRes = await fetch(actualUploadUrl, { 
          method: 'PUT', 
          headers: { 
            'Content-Type': type,
            'x-amz-acl': 'public-read' // 🔥 THE FIX: Force public read permissions!
          }, 
          body: blob 
        });
        if (!uploadRes.ok) throw new Error("PUT Upload failed with status: " + uploadRes.status);
      }
      
      // 5. Look for a guaranteed Public URL from the backend first, fallback to constructing it
      const publicUrl = presignData.publicUrl || presignData.public_url;
      const fallbackUrl = `${actualUploadUrl.split('?')[0]}/${presignData.objectKey || presignData.key || ''}`;
      
      // Clean up any trailing slashes
      const finalAvatarUrl = publicUrl || (fallbackUrl.endsWith('/') ? fallbackUrl.slice(0, -1) : fallbackUrl);
      
      setFormData(prev => ({ ...prev, avatar_url: finalAvatarUrl }));
      
      // 6. Reset states
      URL.revokeObjectURL(pendingAvatar.previewUrl);
      setPendingAvatar(null);
      setZoom(1); 
      
    } catch (err) {
      alert("Failed to upload custom avatar.");
      console.error(err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCancelAvatar = () => {
    if (pendingAvatar) URL.revokeObjectURL(pendingAvatar.previewUrl);
    setPendingAvatar(null);
    setZoom(1); // Reset zoom
  };

  // Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    avatar_url: user?.avatar_url || AVATAR_PRESETS[0],
    is_private: user?.is_private || false,
    show_last_seen: user?.show_last_seen !== false,
  });

  // Notification State
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    likes: true,
    comments: true,
    friend_requests: true,
    mentions: true,
    dm_messages: true,
    group_messages: true
  });

  // Fetch initial notification preferences
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await api.get('/users/me/notification-preferences');
        if (res.data || res) {
          setNotifications(res.data || res);
        }
      } catch (err) {
        console.error("Failed to load notification preferences", err);
      } finally {
        setIsLoadingPrefs(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleNotificationToggle = (key: keyof NotificationPrefs) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save User Profile
      const profileRes = await api.patch('/users/me', {
        name: formData.name,
        avatar_url: formData.avatar_url,
        is_private: formData.is_private,
        show_last_seen: formData.show_last_seen
      });
      
      // 2. Save Notification Preferences
      await api.patch('/users/me/notification-preferences', notifications);
      
      const updatedData = profileRes.data || profileRes;
      completeOnboarding(updatedData); 
      setShowSuccessModal(true); 
    } catch (err: any) {
      alert(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#030303] scrollbar-hide pb-24 md:pb-12 transition-colors duration-300">
        
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-extrabold text-gray-900 dark:text-white tracking-tight transition-colors">Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium mt-1 transition-colors">Manage your identity and app preferences.</p>
          </div>

          <div className="space-y-6 md:space-y-8">
            
            {/* --- SECTION: IDENTITY (Full Width) --- */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1 transition-colors">Identity</h3>
              <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[1.5rem] md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                
                {/* UPGRADED: Big Avatar Preview + Presets */}
                <div className="p-5 md:p-6 border-b border-gray-100 dark:border-[#272729] transition-colors flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
                  
                  {/* Big Clickable Upload Avatar */}
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-[#1A1A1B] group cursor-pointer transition-transform hover:scale-105 ring-1 ring-gray-200 dark:ring-[#343536]"
                    >
                      <img src={formData.avatar_url} alt="Preview" className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800" />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                        <Camera className="text-white mb-1" size={24} strokeWidth={2} />
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Upload</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider for Desktop */}
                  <div className="hidden md:block w-px bg-gray-100 dark:bg-[#272729] self-stretch"></div>

                  {/* Presets Grid */}
                  <div className="flex-1 w-full text-center md:text-left">
                    <label className="block text-[10px] md:text-xs font-extrabold text-gray-500 dark:text-gray-400 mb-3 md:mb-4 uppercase tracking-widest transition-colors">Or choose a preset</label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 justify-center md:justify-start">
                      {AVATAR_PRESETS.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setFormData({ ...formData, avatar_url: url })}
                          className={`aspect-square rounded-full overflow-hidden border-4 transition-all duration-300 mx-auto w-full max-w-[3rem] ${
                            formData.avatar_url === url 
                            ? 'border-blue-500 scale-110 shadow-[0_4px_15px_rgba(59,130,246,0.4)] z-10' 
                            : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-200 dark:hover:border-[#343536] hover:scale-105'
                          }`}
                        >
                          <img src={url} alt="preset" className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800" />
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Name Input */}
                <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-50 dark:bg-[#1E3A8A] flex items-center justify-center text-blue-600 dark:text-blue-200 shrink-0 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] transition-colors">
                      <User className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white transition-colors">Display Name</p>
                      <p className="text-[10px] md:text-[11px] font-medium text-gray-500 dark:text-gray-400 transition-colors">How you appear to others</p>
                    </div>
                  </div>
                  {/* 3D Bulged Input */}
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#343536] rounded-xl px-4 py-2.5 md:py-3 font-bold text-sm text-gray-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#1A1A1B] focus:border-blue-500 w-full sm:w-72 lg:w-80 transition-all shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus:shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_4px_12px_rgba(59,130,246,0.15)] dark:focus:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),_0_4px_12px_rgba(59,130,246,0.3)]"
                  />
                </div>
              </div>
            </section>

            {/* --- SECTION: PRIVACY (Full Width, 2 Columns) --- */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1 transition-colors">Privacy</h3>
              <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[1.5rem] md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-[#272729]">
                <ToggleRow 
                  icon={<Globe className="w-5 h-5 md:w-5 md:h-5 text-green-600 dark:text-green-500" strokeWidth={2.5} />} 
                  iconBg="bg-green-50 dark:bg-[#14532D]"
                  label="Private Account" 
                  desc="Require approval for message requests"
                  enabled={formData.is_private}
                  onToggle={() => setFormData({...formData, is_private: !formData.is_private})}
                />
                <ToggleRow 
                  icon={<Eye className="w-5 h-5 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />} 
                  iconBg="bg-purple-50 dark:bg-[#4C1D95]"
                  label="Online Presence" 
                  desc="Let friends see when you're online"
                  enabled={formData.show_last_seen}
                  onToggle={() => setFormData({...formData, show_last_seen: !formData.show_last_seen})}
                />
              </div>
            </section>

            {/* --- SECTION: NOTIFICATIONS (Full Width) --- */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1 transition-colors">Notifications</h3>
              {isLoadingPrefs ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
              ) : (
                <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[1.5rem] md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 divide-y divide-gray-100 dark:divide-[#272729] grid grid-cols-1 md:grid-cols-2 md:divide-y-0 md:divide-x">
                  
                  {/* Left Column */}
                  <div className="divide-y divide-gray-100 dark:divide-[#272729]">
                    <ToggleRow 
                      icon={<Heart className="w-5 h-5 md:w-5 md:h-5 text-pink-600 dark:text-pink-500" strokeWidth={2.5} />} 
                      iconBg="bg-pink-50 dark:bg-pink-900/30"
                      label="Likes & Reactions" 
                      desc="When someone sparks your post"
                      enabled={notifications.likes}
                      onToggle={() => handleNotificationToggle('likes')}
                    />
                    <ToggleRow 
                      icon={<MessageSquare className="w-5 h-5 md:w-5 md:h-5 text-blue-600 dark:text-blue-500" strokeWidth={2.5} />} 
                      iconBg="bg-blue-50 dark:bg-blue-900/30"
                      label="Comments" 
                      desc="Replies to your posts or comments"
                      enabled={notifications.comments}
                      onToggle={() => handleNotificationToggle('comments')}
                    />
                    <ToggleRow 
                      icon={<AtSign className="w-5 h-5 md:w-5 md:h-5 text-orange-600 dark:text-orange-500" strokeWidth={2.5} />} 
                      iconBg="bg-orange-50 dark:bg-orange-900/30"
                      label="Mentions" 
                      desc="When someone @tags you"
                      enabled={notifications.mentions}
                      onToggle={() => handleNotificationToggle('mentions')}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="divide-y divide-gray-100 dark:divide-[#272729]">
                    <ToggleRow 
                      icon={<Users className="w-5 h-5 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-500" strokeWidth={2.5} />} 
                      iconBg="bg-indigo-50 dark:bg-indigo-900/30"
                      label="Friend Requests" 
                      desc="New connection invitations"
                      enabled={notifications.friend_requests}
                      onToggle={() => handleNotificationToggle('friend_requests')}
                    />
                    <ToggleRow 
                      icon={<Bell className="w-5 h-5 md:w-5 md:h-5 text-teal-600 dark:text-teal-500" strokeWidth={2.5} />} 
                      iconBg="bg-teal-50 dark:bg-teal-900/30"
                      label="Direct Messages" 
                      desc="Private 1-on-1 chat messages"
                      enabled={notifications.dm_messages}
                      onToggle={() => handleNotificationToggle('dm_messages')}
                    />
                    <ToggleRow 
                      icon={<Users className="w-5 h-5 md:w-5 md:h-5 text-cyan-600 dark:text-cyan-500" strokeWidth={2.5} />} 
                      iconBg="bg-cyan-50 dark:bg-cyan-900/30"
                      label="Group Messages" 
                      desc="Activity in your group chats"
                      enabled={notifications.group_messages}
                      onToggle={() => handleNotificationToggle('group_messages')}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* --- SECTION: ACCOUNT (Bottom Danger Zone) --- */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1 transition-colors">Account</h3>
              <div className="bg-white dark:bg-[#1A1A1B] border border-red-200 dark:border-[#501e1e] rounded-[1.5rem] md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-5 md:p-6 flex items-center justify-between group cursor-pointer hover:bg-red-50 dark:hover:bg-[#3f1616] transition-colors" onClick={logout}>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-50 dark:bg-[#7F1D1D] flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
                        <LogOut className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-xs md:text-sm font-bold text-red-600 dark:text-red-500 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">Log Out</p>
                        <p className="text-[10px] md:text-[11px] font-medium text-gray-500 dark:text-gray-400 transition-colors">Sign out of your account securely</p>
                      </div>
                   </div>
                </div>
              </div>
            </section>

          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-lg border-t border-gray-200 dark:border-[#343536] md:relative md:bg-transparent md:dark:bg-transparent md:border-none md:p-0 md:mt-8 flex justify-end z-40 transition-colors duration-300">
             <button 
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim() || isLoadingPrefs}
                className="w-full md:w-auto px-8 md:px-10 py-3.5 md:py-4 bg-blue-600 dark:bg-[#1E3A8A] border border-blue-700 dark:border-[#1E40AF] text-white text-sm md:text-base font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_10px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_6px_15px_rgba(37,99,235,0.4)] dark:hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_6px_15px_rgba(0,0,0,0.6)]"
             >
                {isSaving ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" strokeWidth={2.5} /> : <Save className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />}
                {isSaving ? 'Saving...' : 'Save All Changes'}
             </button>
          </div>

        </div>
      </div>

      <Modal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
        title="Success"
        footer={
          <button 
            onClick={() => setShowSuccessModal(false)} 
            className="w-full py-3 md:py-3.5 bg-blue-600 dark:bg-[#1E3A8A] border border-blue-700 dark:border-[#1E40AF] text-white text-sm md:text-base font-bold rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_10px_rgba(0,0,0,0.4)] hover:-translate-y-0.5"
          >
            Great!
          </button>
        }
      >
        <div className="flex flex-col items-center text-center py-4 md:py-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-green-50 dark:bg-[#14532D] text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4 md:mb-5 border border-green-200 dark:border-[#166534] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10" strokeWidth={2.5} />
          </div>
          <h4 className="text-lg md:text-xl font-display font-extrabold text-gray-900 dark:text-white mb-1 md:mb-2">Settings Saved</h4>
          <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Your profile and notification preferences have been updated.</p>
        </div>
      </Modal>

      {/* --- AVATAR PREVIEW MODAL --- */}
      {pendingAvatar && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleCancelAvatar}></div>
          <div className="relative bg-white dark:bg-[#1A1A1B] w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-[#272729]">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#272729] shrink-0">
              <h2 className="font-display font-bold text-gray-900 dark:text-white text-lg">Adjust Profile Picture</h2>
              <button onClick={handleCancelAvatar} className="p-2 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full transition-colors text-gray-500"><X size={20} /></button>
            </div>

            <div className="p-6 flex flex-col bg-gray-50 dark:bg-[#0a0a0a]">
              
              {/* Interactive Cropper Canvas */}
              <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 mb-6 ring-1 ring-inset ring-gray-200 dark:ring-[#272729]">
                <Cropper
                  image={pendingAvatar.previewUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round" // Gives us that perfect circular preview!
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels as any)}
                  onZoomChange={setZoom}
                />
              </div>

              {/* Zoom Slider */}
              <div className="flex items-center gap-4 px-2">
                <ZoomOut size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.01}
                  aria-label="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-200 dark:bg-[#272729] rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                />
                <ZoomIn size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-[#272729] bg-white dark:bg-[#1A1A1B] flex gap-3 shrink-0">
              <button 
                onClick={handleCancelAvatar} 
                disabled={isUploadingAvatar}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-[#272729] dark:hover:bg-[#343536] text-gray-900 dark:text-white font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmAvatarUpload} 
                disabled={isUploadingAvatar}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploadingAvatar ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                {isUploadingAvatar ? 'Saving...' : 'Set Picture'}
              </button>
            </div>

          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const ToggleRow = ({ icon, iconBg, label, desc, enabled, onToggle }: any) => (
  <div className="p-5 md:p-6 flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-[#272729] transition-colors cursor-pointer" onClick={onToggle}>
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] transition-colors ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white leading-tight transition-colors">{label}</p>
        <p className="text-[10px] md:text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 transition-colors">{desc}</p>
      </div>
    </div>
    <button 
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`w-12 h-7 md:w-14 md:h-8 rounded-full relative transition-all duration-300 shadow-inner ${enabled ? 'bg-blue-600 dark:bg-[#1E3A8A]' : 'bg-gray-300 dark:bg-[#343536]'}`}
    >
      <div className={`absolute top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full transition-all shadow-[0_2px_4px_rgba(0,0,0,0.2)] ${enabled ? 'left-[1.375rem] md:left-7' : 'left-1'}`}></div>
    </button>
  </div>
);

export default Settings;