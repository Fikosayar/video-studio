import React, { useState } from 'react';
import { ImageIcon, Loader2, Sparkles, Download } from 'lucide-react';
import { generateHighQualityImage, triggerKeySelection } from '../services/geminiService';
import { CreationHistoryItem, MediaType } from '../types';

interface ImageStudioProps {
  onSave: (item: CreationHistoryItem) => void;
}

const ImageStudio: React.FC<ImageStudioProps> = ({ onSave }) => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);

    try {
       // 2K and 4K usually require paid tiers, check key
       if (size !== '1K') {
          if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
             await triggerKeySelection();
          }
       }

       const base64Image = await generateHighQualityImage({
         prompt,
         size
       });
       setResult(base64Image);
       onSave({
         id: crypto.randomUUID(),
         type: MediaType.IMAGE,
         url: base64Image,
         prompt,
         createdAt: Date.now()
       });
    } catch (e: any) {
      setError(e.message || "Image generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
          Nano Banana Pro Studio
        </h2>
        <p className="text-gray-400">Create stunning high-resolution images with Gemini 3 Pro.</p>
      </div>

      <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-6">
         <div className="flex flex-col gap-4">
            <textarea 
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="A futuristic cyberpunk city with neon lights in the rain..."
               className="w-full bg-dark-900 border border-gray-700 rounded-xl p-4 text-white h-32 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            
            <div className="flex items-center gap-4">
               <span className="text-sm text-gray-400">Quality:</span>
               {(['1K', '2K', '4K'] as const).map((s) => (
                 <button
                   key={s}
                   onClick={() => setSize(s)}
                   className={`px-3 py-1 rounded-full text-sm font-medium border ${size === s ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
                 >
                   {s}
                 </button>
               ))}
            </div>
         </div>

         {error && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">{error}</div>}

         <button
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 py-3 rounded-xl font-bold text-white hover:shadow-lg hover:shadow-emerald-900/20 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
         >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Generate Image
         </button>
      </div>

      {result && (
        <div className="bg-dark-800 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
           <img src={result} alt="Generated" className="max-h-[600px] rounded-lg shadow-2xl" />
           <a href={result} download="gemini-pro-gen.png" className="mt-4 flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
              <Download className="w-4 h-4" /> Download
           </a>
        </div>
      )}
    </div>
  );
};

export default ImageStudio;