import React, { useState } from 'react';
import { ImageIcon, Loader2, Sparkles, Download, X } from 'lucide-react';
import { generateHighQualityImage, triggerKeySelection } from '../services/geminiService';
import { CreationHistoryItem, MediaType } from '../types';

interface ImageStudioProps {
  onSave: (item: CreationHistoryItem) => void;
}

const ImageStudio: React.FC<ImageStudioProps> = ({ onSave }) => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:3'>('1:1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [currentTag, setCurrentTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && currentTag.trim()) {
          e.preventDefault();
          setTags([...tags, currentTag.trim()]);
          setCurrentTag('');
      }
  }

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);

    try {
       // 2K and 4K usually require paid tiers, check key
       if (size !== '1K') {
          if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
             const selected = await triggerKeySelection();
             if (!selected) throw new Error("API Key required for high-res generation.");
          }
       }

       const base64Image = await generateHighQualityImage({
         prompt,
         size,
         aspectRatio,
         tags
       });
       setResult(base64Image);
       onSave({
         id: crypto.randomUUID(),
         type: MediaType.IMAGE,
         url: base64Image,
         prompt,
         tags,
         createdAt: Date.now(),
         metadata: {
             aspectRatio,
             resolution: size,
             model: 'gemini-3-pro-image-preview'
         }
       });
    } catch (e: any) {
      setError(e.message || "Image generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Main Input Area */}
      <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
            Nano Banana Pro Studio
            </h2>
            <p className="text-gray-400">Create stunning high-resolution images with Gemini 3 Pro.</p>
        </div>

        <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-6">
            <textarea 
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="A futuristic cyberpunk city with neon lights in the rain..."
               className="w-full bg-dark-900 border border-gray-700 rounded-xl p-4 text-white h-40 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            
            <div className="space-y-2">
                 <label className="block text-sm font-medium text-gray-300">Tags</label>
                 <div className="flex items-center gap-2 bg-dark-900 border border-gray-700 rounded-xl px-3 py-2">
                     {tags.map((t, i) => (
                         <span key={i} className="bg-emerald-900/40 text-emerald-300 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                             #{t} <button onClick={() => setTags(tags.filter((_, idx) => idx !== i))}><X size={12} /></button>
                         </span>
                     ))}
                     <input 
                        type="text" 
                        value={currentTag} 
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Add tags..."
                        className="bg-transparent outline-none text-sm flex-1 text-white"
                     />
                 </div>
             </div>

            {error && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">{error}</div>}

            <button
                onClick={handleGenerate}
                disabled={loading || !prompt}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 py-4 rounded-xl font-bold text-white hover:shadow-lg hover:shadow-emerald-900/20 transition-all disabled:opacity-50 flex justify-center items-center gap-2 hover:scale-[1.01]"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Generate Image
            </button>
        </div>
        
        {result && (
            <div className="bg-dark-800 p-4 rounded-2xl border border-white/5 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-white font-medium mb-4 w-full text-left">Result</h3>
                <img src={result} alt="Generated" className="max-h-[600px] rounded-lg shadow-2xl w-full object-contain bg-black" />
                <div className="w-full flex justify-end mt-4">
                    <a href={result} download="gemini-pro-gen.png" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 px-4 py-2 rounded-lg hover:bg-emerald-900/20 transition-colors">
                        <Download className="w-4 h-4" /> Download
                    </a>
                </div>
            </div>
        )}
      </div>

      {/* Controls Sidebar */}
      <div className="space-y-6">
          <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-white">
                  <ImageIcon className="w-5 h-5" /> Configuration
              </h3>
              
              <div className="space-y-6">
                  <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 block">Resolution</label>
                      <div className="grid grid-cols-3 gap-2">
                          {(['1K', '2K', '4K'] as const).map((s) => (
                            <button
                            key={s}
                            onClick={() => setSize(s)}
                            className={`py-2 rounded-lg text-sm font-medium border transition-all ${size === s ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 text-gray-400 hover:bg-white/5'}`}
                            >
                            {s}
                            </button>
                        ))}
                      </div>
                  </div>

                  <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 block">Aspect Ratio</label>
                      <div className="grid grid-cols-2 gap-2">
                          {[
                              { id: '1:1', label: 'Square (1:1)' },
                              { id: '16:9', label: 'Landscape (16:9)' },
                              { id: '9:16', label: 'Portrait (9:16)' },
                              { id: '4:3', label: 'Standard (4:3)' }
                          ].map((r) => (
                              <button
                                  key={r.id}
                                  onClick={() => setAspectRatio(r.id as any)}
                                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${aspectRatio === r.id ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 text-gray-400 hover:bg-white/5'}`}
                              >
                                  {r.label}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ImageStudio;