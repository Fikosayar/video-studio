
import React, { useState } from 'react';
import { ImageIcon, Loader2, Sparkles, Download, X, Upload, Layers, RefreshCcw, Plus } from 'lucide-react';
import { generateHighQualityImage, editImage, mergeImages, triggerKeySelection } from '../services/geminiService';
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
  
  // Reference Images (Array for Multi-Image Blend)
  const [referenceImages, setReferenceImages] = useState<{id: string, url: string}[]>([]);

  const [currentTag, setCurrentTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && currentTag.trim()) {
          e.preventDefault();
          setTags([...tags, currentTag.trim()]);
          setCurrentTag('');
      }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
          Array.from(files).forEach(file => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  setReferenceImages(prev => [...prev, { 
                      id: crypto.randomUUID(), 
                      url: reader.result as string 
                  }]);
              };
              reader.readAsDataURL(file);
          });
      }
  }

  const removeReference = (id: string) => {
      setReferenceImages(prev => prev.filter(img => img.id !== id));
  }

  // Determine Mode based on inputs
  const getMode = () => {
      if (referenceImages.length === 0) return 'GENERATE'; // Text-to-Image
      if (referenceImages.length === 1) return 'EDIT';     // Image-to-Image (Edit)
      return 'COMPOSE';                                    // Multi-Image Blend
  };

  const mode = getMode();

  const handleGenerate = async () => {
    if (!prompt && mode === 'GENERATE') return; // Prompt required for gen
    setLoading(true);
    setError(null);

    try {
       // Check API Key
       if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
          await triggerKeySelection();
       }

       let base64Result = '';
       let modelUsed = '';

       if (mode === 'EDIT') {
           // GEMINI 2.5 FLASH IMAGE (Fast Editing)
           const rawBase64 = referenceImages[0].url.split(',')[1];
           base64Result = await editImage({
               imageBase64: rawBase64,
               mimeType: 'image/png', // Assuming png for dataURL
               prompt: prompt || "Enhance this image"
           });
           modelUsed = 'gemini-2.5-flash-image';

       } else if (mode === 'COMPOSE') {
           // GEMINI 3 PRO IMAGE (Composition/Blend)
           const rawImages = referenceImages.map(img => img.url.split(',')[1]);
           base64Result = await mergeImages(rawImages, prompt);
           modelUsed = 'gemini-3-pro-image-preview (blend)';

       } else {
           // GEMINI 3 PRO IMAGE (Text-to-Image)
           base64Result = await generateHighQualityImage({
               prompt,
               size,
               aspectRatio,
               tags
           });
           modelUsed = 'gemini-3-pro-image-preview';
       }

       setResult(base64Result);
       onSave({
         id: crypto.randomUUID(),
         type: MediaType.IMAGE,
         url: base64Result,
         prompt: prompt || (mode === 'COMPOSE' ? 'Multi-Image Composition' : 'Image Generation'),
         tags: [...tags, mode === 'GENERATE' ? 'Generated' : mode === 'EDIT' ? 'Edited' : 'Composite'],
         createdAt: Date.now(),
         metadata: {
             aspectRatio,
             resolution: size,
             model: modelUsed
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
            <p className="text-gray-400">
                {mode === 'GENERATE' && "Generate high-fidelity images from text."}
                {mode === 'EDIT' && "Edit or transform your image with instructions."}
                {mode === 'COMPOSE' && "Blend multiple images into a cohesive composition."}
            </p>
        </div>

        <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-6">
            
            {/* Reference Images Area */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <Layers size={14} /> 
                        Reference Assets ({referenceImages.length})
                    </label>
                    <label className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1 bg-emerald-900/20 px-2 py-1 rounded-md transition-colors">
                        <Plus size={12} /> Add Images
                        <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" multiple />
                    </label>
                </div>
                
                {referenceImages.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 bg-dark-900/50">
                        <p className="text-sm mb-2">No references selected (Text-to-Image Mode)</p>
                        <p className="text-xs opacity-60">Upload 1 image to Edit, or 2+ to Blend.</p>
                    </div>
                ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                        {referenceImages.map((img, idx) => (
                            <div key={img.id} className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-gray-600 group">
                                <img src={img.url} className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => removeReference(img.id)}
                                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white text-center py-0.5">
                                    Ref {idx + 1}
                                </div>
                            </div>
                        ))}
                        <label className="shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-emerald-500/50 transition-colors text-gray-500">
                            <Plus size={20} />
                            <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" multiple />
                        </label>
                    </div>
                )}
            </div>

            <div className="relative">
                <div className="absolute top-3 right-3 px-2 py-1 bg-dark-900/80 rounded text-[10px] font-bold text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                    {mode} Mode
                </div>
                <textarea 
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                   placeholder={
                       mode === 'GENERATE' ? "Describe your image (e.g., 'A futuristic cyberpunk city')..." :
                       mode === 'EDIT' ? "Describe changes (e.g., 'Make it sunset', 'Add a hat')..." :
                       "Describe how to combine these images (e.g., 'Mix the style of Ref 1 with the subject of Ref 2')..."
                   }
                   className="w-full bg-dark-900 border border-gray-700 rounded-xl p-4 text-white h-32 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
                />
            </div>
            
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
                disabled={loading || (!prompt && mode === 'GENERATE')}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 py-4 rounded-xl font-bold text-white hover:shadow-lg hover:shadow-emerald-900/20 transition-all disabled:opacity-50 flex justify-center items-center gap-2 hover:scale-[1.01]"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {mode === 'GENERATE' ? 'Generate Image' : mode === 'EDIT' ? 'Apply Edits' : 'Compose & Blend'}
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
                            disabled={mode === 'EDIT'} 
                            className={`py-2 rounded-lg text-sm font-medium border transition-all ${size === s ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 text-gray-400 hover:bg-white/5'} ${mode === 'EDIT' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                            {s}
                            </button>
                        ))}
                      </div>
                      {mode === 'EDIT' && <p className="text-[10px] text-gray-500 mt-2 italic">Native resolution used for editing.</p>}
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
                                  disabled={mode === 'EDIT'}
                                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${aspectRatio === r.id ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 text-gray-400 hover:bg-white/5'} ${mode === 'EDIT' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
