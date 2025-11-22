import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, User } from '../types';
import { SecurityService } from '../services/securityService';
import { Shield, Lock, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';

interface AuthPortalProps {
  onLogin: (user: User) => void;
}

const AuthPortal: React.FC<AuthPortalProps> = ({ onLogin }) => {
  const [status, setStatus] = useState<'IDLE' | 'SECURING' | 'CONNECTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Initialize Security
  useEffect(() => {
    SecurityService.generateCsrfToken();
  }, []);

  // Setup Google Button
  useEffect(() => {
    if (status === 'IDLE' || status === 'ERROR') {
      const interval = setInterval(() => {
        const google = (window as any).google;
        if (google && google.accounts && googleButtonRef.current) {
          google.accounts.id.initialize({
            client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
            callback: handleGoogleResponse
          });
          google.accounts.id.renderButton(
            googleButtonRef.current,
            { theme: "filled_black", size: "large", type: "standard", shape: "pill", width: "100%" }
          );
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [status]);

  const validateAndLogin = async (user: User) => {
    try {
      setStatus('SECURING');
      await new Promise(resolve => setTimeout(resolve, 600)); // Simulate security scan
      
      // 1. CSRF Check
      if (!SecurityService.validateCsrfToken()) {
        throw new Error("Security integrity check failed (CSRF). Please refresh.");
      }

      // 2. Temp Mail Check
      SecurityService.validateEmailDomain(user.email);

      setStatus('SUCCESS');
      await new Promise(resolve => setTimeout(resolve, 500));
      onLogin(user);

    } catch (e: any) {
      console.error("Security Block:", e);
      setErrorMsg(e.message || "Authentication failed");
      setStatus('ERROR');
    }
  };

  const handleGoogleResponse = (response: any) => {
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const payload = JSON.parse(jsonPayload);

      const newUser: User = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        photoUrl: payload.picture,
        provider: AuthProvider.GOOGLE
      };
      validateAndLogin(newUser);
    } catch (e) {
      setErrorMsg("Google Token parsing failed.");
      setStatus('ERROR');
    }
  };

  const handleGithubLogin = () => {
    // Simulation of OAuth
    setStatus('CONNECTING');
    setTimeout(() => {
      // Mocked GitHub User
      const mockUser: User = {
        id: `gh_${Math.random().toString(36).substr(2, 9)}`,
        name: 'GitHub Developer',
        email: 'developer@github.com', // Change to 'test@yopmail.com' to test security blocker
        photoUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
        provider: AuthProvider.GITHUB
      };
      validateAndLogin(mockUser);
    }, 1500);
  };

  const handleAppleLogin = () => {
     // Simulation of OAuth
    setStatus('CONNECTING');
    setTimeout(() => {
      const mockUser: User = {
        id: `apple_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Apple User',
        email: 'user@icloud.com',
        photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Apple_logo_white.svg',
        provider: AuthProvider.APPLE
      };
      validateAndLogin(mockUser);
    }, 1500);
  };

  const handleGuestLogin = () => {
     const mockUser: User = {
        id: 'guest_' + Date.now(),
        name: 'Guest Artist',
        email: 'guest@local.studio',
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
        provider: AuthProvider.GUEST
      };
      validateAndLogin(mockUser);
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/10 shadow-2xl mb-6">
             <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome Back</h1>
          <p className="text-gray-400">Secure access to your Creative Studio</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          {status === 'IDLE' || status === 'ERROR' ? (
             <div className="space-y-4">
                {/* Google */}
                <div className="h-12 w-full relative overflow-hidden rounded-full" ref={googleButtonRef}>
                   {/* Google Button rendered here */}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Apple */}
                    <button onClick={handleAppleLogin} className="h-12 flex items-center justify-center gap-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors">
                        <svg className="w-5 h-5" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 79.4c14.2 44.3 52.8 127 92.6 126.6 27.6-.3 37.2-18.6 70.4-18.6 31.8 0 41.6 18.2 69.7 18.2 40.7.4 78.8-82.1 92.9-124.6-46.4-20.1-65.1-48.4-65.3-85.8Zm-77.5-160c21.2-26.2 38.2-63.7 33.9-100.7-31.5 1.7-70.5 20.9-93.3 47.6-19.5 22.5-37.3 60.7-33.1 96.7 34.5 2.6 69.9-19.2 92.5-43.6Z"/></svg>
                        Apple
                    </button>
                    
                    {/* GitHub */}
                    <button onClick={handleGithubLogin} className="h-12 flex items-center justify-center gap-2 bg-[#24292e] text-white border border-white/10 rounded-full font-medium hover:bg-[#2f363d] transition-colors">
                         <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                        GitHub
                    </button>
                </div>

                <div className="relative py-4">
                   <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                   <span className="relative block bg-transparent px-2 text-xs text-center text-gray-500 uppercase mx-auto w-fit bg-gray-900">Or</span>
                </div>

                <button onClick={handleGuestLogin} className="w-full h-12 rounded-full border border-white/10 hover:bg-white/5 text-gray-300 text-sm font-medium transition-colors">
                  Continue as Guest
                </button>

                {errorMsg && (
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-4 animate-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-400">{errorMsg}</p>
                  </div>
                )}
             </div>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-6">
               {status === 'SECURING' && (
                 <>
                   <div className="relative">
                     <Shield className="w-16 h-16 text-blue-500 animate-pulse" />
                     <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-ping" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-blue-400">Security Scan</h3>
                      <p className="text-sm text-gray-500">Verifying email integrity & CSRF tokens...</p>
                   </div>
                 </>
               )}
               
               {status === 'CONNECTING' && (
                 <>
                   <Loader2 className="w-16 h-16 text-purple-500 animate-spin" />
                   <div>
                      <h3 className="text-lg font-bold text-purple-400">Authenticating</h3>
                      <p className="text-sm text-gray-500">Handshaking with provider...</p>
                   </div>
                 </>
               )}

               {status === 'SUCCESS' && (
                 <>
                   <CheckCircle className="w-16 h-16 text-green-500 animate-in zoom-in duration-300" />
                   <div>
                      <h3 className="text-lg font-bold text-green-400">Access Granted</h3>
                      <p className="text-sm text-gray-500">Welcome to the Studio.</p>
                   </div>
                 </>
               )}
            </div>
          )}
        </div>
        
        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-gray-600">
           <span className="flex items-center gap-1"><Lock size={12}/> 256-bit Encryption</span>
           <span className="flex items-center gap-1"><Shield size={12}/> Threat Protection</span>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;