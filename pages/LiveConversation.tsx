import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Volume2, Activity } from 'lucide-react';
import { createPCMBlob, decodeAudioData, decodePCM } from '../utils/audio';

const LiveConversation: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const videoRef = useRef<HTMLVideoElement>(null); // For future video expansion
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);

  const stopSession = () => {
    if (sessionRef.current) {
       // Ideally close session, but SDK doesn't expose close() on the promise result easily without cleanup
       // We mainly stop our audio processing
    }
    
    // Stop all playing audio
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (audioContextRef.current) audioContextRef.current.close();
    if (inputContextRef.current) inputContextRef.current.close();

    setIsActive(false);
    setStatus('disconnected');
  };

  const startSession = async () => {
    try {
      setStatus('connecting');
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('connected');
            setIsActive(true);
            
            // Setup Microphone Streaming
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPCMBlob(inputData);
              
              sessionPromise.then((session: any) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio) {
                // Synchronize playback
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                   decodePCM(base64Audio),
                   outputCtx,
                   24000,
                   1
                );
                
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
             }
             
             // Handle Interruption
             if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (err) => {
            console.error(err);
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error("Failed to start live session", e);
      setStatus('disconnected');
      alert("Failed to start session. Ensure API Key is valid and Microphone permission is granted.");
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-4">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${status === 'connected' ? 'bg-red-500/20 animate-pulse-slow shadow-[0_0_50px_rgba(239,68,68,0.3)]' : 'bg-dark-800'}`}>
          {status === 'connected' ? (
             <Activity className="w-16 h-16 text-red-500" />
          ) : (
             <MicOff className="w-12 h-12 text-gray-600" />
          )}
        </div>
        
        <h2 className="text-3xl font-bold">Gemini Live</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Have a real-time, natural voice conversation with Gemini. Low latency, high intelligence.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
         {status === 'disconnected' && (
            <button 
              onClick={startSession}
              className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-colors"
            >
               <Mic className="w-6 h-6" />
               Start Conversation
            </button>
         )}
         
         {status === 'connecting' && (
            <button disabled className="bg-gray-700 text-gray-400 px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 cursor-not-allowed">
               Connecting...
            </button>
         )}

         {status === 'connected' && (
            <button 
              onClick={stopSession}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-colors"
            >
               <MicOff className="w-6 h-6" />
               End Session
            </button>
         )}
         
         <p className="text-xs text-gray-500 mt-4">
            Uses <strong>gemini-2.5-flash-native-audio</strong>. Please use headphones to prevent echo.
         </p>
      </div>
    </div>
  );
};

export default LiveConversation;