import React, { useState } from 'react';
import { Upload, Film, Loader2, AlertCircle } from 'lucide-react';
import { generateVideo, triggerKeySelection } from '../services/geminiService';
import { CreationHistoryItem, MediaType } from '../types';

interface VeoStudioProps {
  onSave: (item: CreationHistoryItem) => void;
}

const VeoStudio: React.FC<VeoStudioProps> = ({ onSave }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Strip prefix for API
        setSelectedImage(base64.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt && !selectedImage) return;
    setLoading(true);
    setError(null);
    setGeneratedVideo(null);

    try {
      // Check/Request Key first (Veo requires paid key)
      if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
         await triggerKeySelection();
      }

      const videoUrl = await generateVideo({
        prompt,
        image: selectedImage || undefined,
        aspectRatio
      });

      setGeneratedVideo(videoUrl);
      
      onSave({
        id: crypto.randomUUID(),
        type: MediaType.VIDEO,
        url: videoUrl,
        prompt: prompt || 'Image to Video',
        createdAt: Date.now()
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate video. Make sure you have a valid paid API Key selected.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Veo Video Studio
        </h2>
        <p className="text-gray-400">Generate high-quality videos from text or images.</p>
      </div>

      <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
             <label className="block text-sm font-medium text-gray-300">Prompt</label>
             <textarea
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="Describe the video you want to see... (e.g., A futuristic city with flying cars)"
               className="w-full bg-dark-900 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none"
             />

             <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Aspect Ratio</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setAspectRatio('16:9')}
                    className={`px-4 py-2 rounded-lg border ${aspectRatio === '16:9' ? 'bg-purple-600 border-purple-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
                  >
                    Landscape (16:9)
                  </button>
                  <button 
                    onClick={() => setAspectRatio('9:16')}
                    className={`px-4 py-2 rounded-lg border ${aspectRatio === '9:16' ? 'bg-purple-600 border-purple-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
                  >
                    Portrait (9:16)
                  </button>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <label className="block text-sm font-medium text-gray-300">Source Image (Optional)</label>
             <div className="relative h-32 w-full border-2 border-dashed border-gray-700 rounded-xl hover:border-purple-500 transition-colors group cursor-pointer overflow-hidden flex items-center justify-center bg-dark-900">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {selectedImage ? (
                  <img src={`data:image/png;base64,${selectedImage}`} alt="Source" className="h-full w-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                ) : (
                  <div className="text-center text-gray-500">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <span className="text-sm">Upload an image to animate</span>
                  </div>
                )}
             </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || (!prompt && !selectedImage)}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Video (This may take a minute)...
            </>
          ) : (
            <>
              <Film className="w-5 h-5" />
              Generate Video
            </>
          )}
        </button>
      </div>

      {generatedVideo && (
        <div className="bg-dark-800 p-4 rounded-2xl border border-white/5">
          <h3 className="text-lg font-medium mb-4 text-white">Result</h3>
          <div className="aspect-video rounded-xl overflow-hidden bg-black relative">
             <video src={generatedVideo} controls autoPlay loop className="w-full h-full object-contain" />
          </div>
          <div className="mt-4 flex justify-end">
            <a href={generatedVideo} download="veo-creation.mp4" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
              Download MP4
            </a>
          </div>
        </div>
      )}
      
      <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 text-blue-200 text-sm">
         <strong>Note:</strong> Veo requires a paid billing account. If you haven't selected a project, a popup will appear. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline">Learn more about billing</a>.
      </div>
    </div>
  );
};

export default VeoStudio;