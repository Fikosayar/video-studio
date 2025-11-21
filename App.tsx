import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import { User, CreationHistoryItem } from './types';
import { getHistory, saveToHistory, deleteFromHistory, updateHistoryItem } from './services/storageService';
import { triggerKeySelection } from './services/geminiService';
import HistoryGallery from './components/HistoryGallery';
import VeoStudio from './pages/VeoStudio';
import ImageStudio from './pages/ImageStudio';
import MagicEditor from './pages/MagicEditor';
import LiveConversation from './pages/LiveConversation';
import { Film, Image as ImageIcon, Wand2, Mic, Grid } from 'lucide-react';

// Mock User Data fallback
const MOCK_USER: User = {
  id: 'user_demo_123',
  name: 'Demo User',
  email: 'demo.user@gmail.com',
  photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'gallery' | 'veo' | 'image' | 'edit' | 'live'>('gallery');
  const [history, setHistory] = useState<CreationHistoryItem[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Initialize App & Load Data
  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem('gemini_studio_user');
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          setUser(u);
          const userHistory = await getHistory(u.id);
          setHistory(userHistory);
        } catch (e) {
          console.error("Failed to initialize user data", e);
        }
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  // Setup Google Sign-In Button
  useEffect(() => {
    if (!user && !isInitializing) {
      const setupGoogleLogin = () => {
          // Fix: Cast window to any to access google property
          const google = (window as any).google;
          if (google && google.accounts) {
             google.accounts.id.initialize({
                client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // Placeholder for user to fill
                callback: handleGoogleCallback
             });
             
             if (googleButtonRef.current) {
                google.accounts.id.renderButton(
                   googleButtonRef.current,
                   { theme: "outline", size: "large", type: "standard", shape: "pill" }
                );
             }
          }
      };
      // Retry if script hasn't loaded yet
      const interval = setInterval(() => {
          // Fix: Cast window to any to access google property
          if ((window as any).google) {
              setupGoogleLogin();
              clearInterval(interval);
          }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [user, isInitializing]);

  const handleGoogleCallback = async (response: any) => {
      try {
          // Decode JWT to get user info
          const base64Url = response.credential.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          
          const newUser: User = {
              id: payload.sub,
              name: payload.name,
              email: payload.email,
              photoUrl: payload.picture
          };

          await completeLogin(newUser);
      } catch (e) {
          console.error("Google Login Error", e);
          alert("Login failed. Falling back to demo.");
          handleDemoLogin();
      }
  };

  const handleDemoLogin = async () => {
    await completeLogin(MOCK_USER);
  };

  const completeLogin = async (u: User) => {
    localStorage.setItem('gemini_studio_user', JSON.stringify(u));
    setUser(u);
    
    const userHistory = await getHistory(u.id);
    setHistory(userHistory);

    // Trigger API Key Selection immediately upon login
    setTimeout(() => {
         triggerKeySelection().catch(console.error);
    }, 500);
  };

  const handleLogout = () => {
    localStorage.removeItem('gemini_studio_user');
    delete (window as any).GEMINI_API_KEY_OVERRIDE;
    setUser(null);
    setHistory([]); 
    setActiveTab('gallery');
  };

  const handleSaveItem = async (item: CreationHistoryItem) => {
    if (!user) return;
    try {
      const updated = await saveToHistory(user.id, item);
      setHistory(updated);
    } catch (e) {
      console.error("Failed to save item", e);
    }
  };

  const handleDeleteItem = async (id: string) => {
      if (!user) return;
      if (confirm("Are you sure you want to delete this asset?")) {
          const updated = await deleteFromHistory(user.id, id);
          setHistory(updated);
      }
  }

  const handleUpdateItem = async (id: string, updates: Partial<CreationHistoryItem>) => {
      if (!user) return;
      const updated = await updateHistoryItem(user.id, id, updates);
      setHistory(updated);
  }

  if (isInitializing) {
     return (
       <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center">
          <div className="animate-pulse text-brand-500">Loading Studio...</div>
       </div>
     );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 text-white flex flex-col">
        <Navbar user={null} onLogin={handleDemoLogin} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 to-dark-900">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity animate-pulse-slow"></div>
            <div className="relative bg-black p-6 rounded-full border border-white/10">
               <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" className="w-20 h-20" />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500 tracking-tight">
            Gemini Studio
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl font-light">
            The next generation creative suite. Video, Image, and Voice.
            <br/>Powered by <span className="text-white font-medium">Gemini 2.5 & Veo</span>.
          </p>
          
          <div className="flex flex-col gap-4 items-center w-full max-w-xs">
              {/* Real Google Button Container */}
              <div ref={googleButtonRef} className="h-12"></div>
              
              <div className="relative w-full text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
                  <span className="relative bg-dark-900 px-2 text-xs text-gray-500 uppercase">Or continue as Guest</span>
              </div>

              <button 
                onClick={handleDemoLogin}
                className="w-full px-8 py-3 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-700 transition-colors border border-gray-700"
              >
                Demo Login
              </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col font-sans">
      <Navbar user={user} onLogin={() => {}} onLogout={handleLogout} />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <aside className="hidden md:flex w-72 border-r border-white/5 bg-dark-900 flex-col shrink-0 p-6">
           <div className="space-y-2">
              <NavButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<Grid size={20} />} label="Asset Library" />
              <div className="h-px bg-white/5 my-6 mx-2" />
              <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Creative Tools</p>
              <NavButton active={activeTab === 'veo'} onClick={() => setActiveTab('veo')} icon={<Film size={20} />} label="Veo Video Studio" />
              <NavButton active={activeTab === 'image'} onClick={() => setActiveTab('image')} icon={<ImageIcon size={20} />} label="Nano Banana Pro" />
              <NavButton active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} icon={<Wand2 size={20} />} label="Magic Editor" />
              <NavButton active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={<Mic size={20} />} label="Gemini Live" />
           </div>
        </aside>

        {/* Mobile Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-white/10 z-50 flex justify-around p-3 pb-safe">
           <MobileNavIcon active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<Grid size={24} />} />
           <MobileNavIcon active={activeTab === 'veo'} onClick={() => setActiveTab('veo')} icon={<Film size={24} />} />
           <MobileNavIcon active={activeTab === 'image'} onClick={() => setActiveTab('image')} icon={<ImageIcon size={24} />} />
           <MobileNavIcon active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} icon={<Wand2 size={24} />} />
           <MobileNavIcon active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={<Mic size={24} />} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6 md:p-12 scroll-smooth pb-24 md:pb-12">
           {activeTab === 'gallery' && (
             <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
               <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold">Asset Library</h2>
                  <button className="text-sm text-gray-400 hover:text-white" onClick={() => handleSaveItem} >Refresh</button>
               </div>
               <HistoryGallery items={history} onDeleteItem={handleDeleteItem} onUpdateItem={handleUpdateItem} />
             </div>
           )}
           
           <div className="animate-in slide-in-from-bottom-8 duration-500 fade-in">
                {activeTab === 'veo' && <VeoStudio onSave={handleSaveItem} userId={user.id} history={history} />}
                {activeTab === 'image' && <ImageStudio onSave={handleSaveItem} />}
                {activeTab === 'edit' && <MagicEditor onSave={handleSaveItem} />}
                {activeTab === 'live' && <LiveConversation />}
           </div>
        </main>
      </div>
    </div>
  );
};

// Helper Nav Components
const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
        active 
        ? 'bg-white text-black shadow-xl shadow-white/10 font-semibold' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <span className={active ? 'text-black' : 'group-hover:text-white transition-colors'}>{icon}</span>
    <span>{label}</span>
  </button>
);

const MobileNavIcon = ({ active, onClick, icon }: any) => (
    <button onClick={onClick} className={`p-2 rounded-full ${active ? 'text-white bg-white/20' : 'text-gray-500'}`}>
        {icon}
    </button>
);

export default App;