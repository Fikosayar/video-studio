import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import { User, CreationHistoryItem } from './types';
import { getHistory, saveToHistory } from './services/storageService';
import HistoryGallery from './components/HistoryGallery';
import VeoStudio from './pages/VeoStudio';
import ImageStudio from './pages/ImageStudio';
import MagicEditor from './pages/MagicEditor';
import LiveConversation from './pages/LiveConversation';
import { Film, Image as ImageIcon, Wand2, Mic, Grid } from 'lucide-react';

// Mock User Data for "Google Sign In" simulation
const MOCK_USER: User = {
  id: 'user_123',
  name: 'Demo User',
  email: 'demo.user@example.com',
  photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'gallery' | 'veo' | 'image' | 'edit' | 'live'>('gallery');
  const [history, setHistory] = useState<CreationHistoryItem[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Simulate Auth State Persistence & Load History
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

  const handleLogin = async () => {
    // In a real app, this would be Firebase Auth or Google Identity Services
    localStorage.setItem('gemini_studio_user', JSON.stringify(MOCK_USER));
    setUser(MOCK_USER);
    
    // Load history for the user
    const userHistory = await getHistory(MOCK_USER.id);
    setHistory(userHistory);
  };

  const handleLogout = () => {
    localStorage.removeItem('gemini_studio_user');
    setUser(null);
    setHistory([]); // Clear UI only, data persists in IndexedDB
    setActiveTab('gallery');
  };

  const handleSaveItem = async (item: CreationHistoryItem) => {
    if (!user) return;
    try {
      const updated = await saveToHistory(user.id, item);
      setHistory(updated);
    } catch (e) {
      console.error("Failed to save item", e);
      // Optional: Show error toast
      alert("Failed to save to gallery. Storage might be full or unavailable.");
    }
  };

  if (isInitializing) {
     return (
       <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center">
          <div className="animate-pulse">Loading Studio...</div>
       </div>
     );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 text-white flex flex-col">
        <Navbar user={null} onLogin={handleLogin} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-75 animate-pulse"></div>
            <div className="relative bg-black p-4 rounded-full">
               <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" className="w-16 h-16" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            Gemini Creator Studio
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            Sign in to access your personal creative suite powered by Gemini 2.5 and Veo.
            Generate videos, edit images, and converse in real-time.
          </p>
          <button 
            onClick={handleLogin}
            className="px-8 py-4 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            Get Started with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col">
      <Navbar user={user} onLogin={handleLogin} onLogout={handleLogout} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-20 md:w-64 border-r border-white/10 bg-dark-900 flex flex-col shrink-0">
           <div className="p-4 space-y-2">
              <NavButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<Grid />} label="My Library" />
              <div className="h-px bg-white/10 my-4" />
              <NavButton active={activeTab === 'image'} onClick={() => setActiveTab('image')} icon={<ImageIcon />} label="Image Gen Pro" />
              <NavButton active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} icon={<Wand2 />} label="Magic Edit" />
              <NavButton active={activeTab === 'veo'} onClick={() => setActiveTab('veo')} icon={<Film />} label="Veo Video" />
              <NavButton active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={<Mic />} label="Live Voice" />
           </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#121212]">
           {activeTab === 'gallery' && (
             <div className="space-y-6">
               <h2 className="text-2xl font-bold">My Library</h2>
               <HistoryGallery items={history} />
             </div>
           )}
           
           {activeTab === 'veo' && <VeoStudio onSave={handleSaveItem} />}
           {activeTab === 'image' && <ImageStudio onSave={handleSaveItem} />}
           {activeTab === 'edit' && <MagicEditor onSave={handleSaveItem} />}
           {activeTab === 'live' && <LiveConversation />}
        </main>
      </div>
    </div>
  );
};

// Helper Nav Component
const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
  >
    {icon}
    <span className="hidden md:block font-medium">{label}</span>
  </button>
);

export default App;