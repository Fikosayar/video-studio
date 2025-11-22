
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import { User, CreationHistoryItem } from './types';
import { getHistory, saveToHistory, deleteFromHistory, updateHistoryItem } from './services/storageService';
import { triggerKeySelection } from './services/geminiService';
import { triggerWebhook } from './services/webhookService';
import HistoryGallery from './components/HistoryGallery';
import VeoStudio from './pages/VeoStudio';
import ImageStudio from './pages/ImageStudio';
import MagicEditor from './pages/MagicEditor';
import LiveConversation from './pages/LiveConversation';
import AuthPortal from './components/AuthPortal';
import { Film, Image as ImageIcon, Wand2, Mic, Grid } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'gallery' | 'veo' | 'image' | 'edit' | 'live'>('gallery');
  const [history, setHistory] = useState<CreationHistoryItem[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

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

  const handleLogin = async (u: User) => {
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
      
      // Trigger Webhook Automation
      triggerWebhook(item);
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
    return <AuthPortal onLogin={handleLogin} />;
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
                  <button className="text-sm text-gray-400 hover:text-white" onClick={() => { getHistory(user.id).then(setHistory); }} >Refresh</button>
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
