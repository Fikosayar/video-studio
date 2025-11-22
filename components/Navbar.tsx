
import React, { useState } from 'react';
import { User, LogOut, Sparkles, Settings } from 'lucide-react';
import { User as UserType } from '../types';
import SettingsModal from './SettingsModal';

interface NavbarProps {
  user: UserType | null;
  onLogin: () => void;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogin, onLogout }) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <nav className="h-16 border-b border-white/10 bg-dark-900 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-blue-500 to-purple-600 p-2 rounded-lg">
             <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Gemini Studio
          </h1>
        </div>

        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <button 
                 onClick={() => setShowSettings(true)}
                 className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                 title="Settings"
              >
                 <Settings className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-white/10" />
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <img 
                  src={user.photoUrl} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full border border-gray-600"
                />
                <span className="hidden sm:block">{user.name}</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-gray-200 transition-colors text-sm"
            >
              <img src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-Pc85r31NMryDzJeXRfE024ap18rGyZ7v0c9J7X_31f85G72J2A20k=w40" className="w-5 h-5" alt="G" />
              Sign in with Google
            </button>
          )}
        </div>
      </nav>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
};

export default Navbar;
