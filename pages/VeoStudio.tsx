import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Film, Loader2, AlertCircle, UserPlus, Trash2, X, Tag as TagIcon, Images, Sparkles, Check, RefreshCcw } from 'lucide-react';
import { generateVideo, triggerKeySelection, enhancePrompt, mergeImages } from '../services/geminiService';
import { CreationHistoryItem, MediaType, Asset } from '../types';
import { getAssets, saveAsset, deleteAsset } from '../services/storageService';

interface VeoStudioProps {
  onSave: (item: CreationHistoryItem) => void;
  userId: string;
  history: CreationHistoryItem[];
}

const VeoStudio: React.FC<VeoStudioProps> = ({ onSave, userId, history }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  
  // Multi-Image State
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // Base64 strings
  const [error, setError] = useState<string | null>(null);
  
  // Magic Features
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedImage, setMergedImage] = useState<string | null>(null);
  
  // Tags
  const [currentTag, setCurrentTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Character/Asset Library
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetImage, setNewAssetImage] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
        getAssets(userId).then(setAssets);
    }
  }, [userId]);

  // Constraint Logic: Multi-Image requires 720p and 16:9
  // Unless we have a Merged Master Frame!
  const isMultiImage = selectedImages.length > 1;
  
  useEffect(() => {
      // Only force constraints if we are in raw multi-image mode
      if (isMultiImage && !mergedImage) {
          setResolution('720p');
          setAspectRatio('16:9');
      }
  }, [isMultiImage, mergedImage]);

  // Compute all unique tags from history for suggestions
  const suggestedTags = useMemo(() => {
      const allTags = new Set<string>();
      history.forEach(item => {
          item.tags?.forEach(t => allTags.add(t.toLowerCase()));
      });
      return Array.from(allTags).sort();
  }, [history]);

  const handleSmartTagClick = (tag: string) => {
      if (!tags.includes(tag)) {
          setTags([...tags, tag]);
      }
      const match = history.find(item => 
          item.type === MediaType.IMAGE && 
          item.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
      );
      if (match) {
          const base64 = match.url.split(',')[1];
          if (!selectedImages.includes(base64)) {
              if (selectedImages.length < 3) {
                  setSelectedImages([...selectedImages, base64]);
              } else {
                  alert("Maximum 3 reference images allowed.");
              }
          }
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isForAsset: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (isForAsset) {
            setNewAssetImage(base64);
        } else {
            const rawBase64 = base64.split(',')[1];
            if (selectedImages.length < 3) {
                setSelectedImages([...selectedImages, rawBase64]);
            } else {
                alert("Maximum 3 reference images allowed.");
            }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleAssetSelection = (asset: Asset) => {
      const base64 = asset.url.split(',')[1];
      if (selectedImages.includes(base64)) {
          setSelectedImages(selectedImages.filter(img => img !== base64));
      } else {
          if (selectedImages.length < 3) {
              setSelectedImages([...selectedImages, base64]);
          }
      }
  };

  const handleSaveAsset = async () => {
    if (!newAssetName || !newAssetImage) return;
    const asset: Asset = {
        id: crypto.randomUUID(),
        userId,
        name: newAssetName,
        url: newAssetImage,
        createdAt: Date.now()
    };
    const updated = await saveAsset(userId, asset);
    setAssets(updated);
    setShowAssetModal(false);
    setNewAssetImage(null);
    setNewAssetName('');
  };

  const handleDeleteAsset = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = await deleteAsset(userId, id);
      setAssets(updated);
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && currentTag.trim()) {
          e.preventDefault();
          setTags([...tags, currentTag.trim()]);
          setCurrentTag('');
      }
  }

  const handleEnhancePrompt = async () => {
      if (!prompt) return;
      setIsEnhancing(true);
      try {
          if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
              await triggerKeySelection();
          }
          const improved = await enhancePrompt(prompt);
          setPrompt(improved);
      } catch (e) {
          console.error(e);
      } finally {
          setIsEnhancing(false);
      }
  };

  const startMergeProcess = async () => {
      setIsMerging(true);
      setError(null);
      setShowMergeModal(true);
      setMergedImage(null);
      try {
          if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
              await triggerKeySelection();
          }
          const merged = await mergeImages(selectedImages, prompt || "A cinematic composition");
          setMergedImage(merged);
      } catch (e: any) {
          setError("Failed to merge images: " + e.message);
          setShowMergeModal(false);
      } finally {
          setIsMerging(false);
      }
  };

  const handleConfirmMerge = () => {
      if (!mergedImage) return;
      setShowMergeModal(false);
      
      // Proceed to generate video using the Merged Image as the SINGLE reference
      const base64 = mergedImage.split(',')[1];
      // Force 1080p/Fast model since we now have 1 perfect input image
      executeVideoGeneration([base64], '1080p'); 
  }

  const handleGenerate = async () => {
    if (!prompt && selectedImages.length === 0) return;
    
    // Intercept Multi-Image Request for Magic Merging
    if (selectedImages.length > 1) {
        startMergeProcess();
        return;
    }
    
    // Normal Flow
    executeVideoGeneration(selectedImages, resolution);
  };

  const executeVideoGeneration = async (imgs: string[], resOverride?: '720p'|'1080p') => {
    setLoading(true);
    setError(null);
    setGeneratedVideo(null);

    try {
      if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
         const selected = await triggerKeySelection();
         if (!selected) throw new Error("API Key required for Veo.");
      }

      const resToUse = resOverride || resolution;

      const videoUrl = await generateVideo({
        prompt,
        images: imgs,
        aspectRatio,
        resolution: resToUse
      });

      setGeneratedVideo(videoUrl);
      
      onSave({
        id: crypto.randomUUID(),
        type: MediaType.VIDEO,
        url: videoUrl,
        prompt: prompt || 'Image to Video',
        tags: tags,
        createdAt: Date.now(),
        metadata: {
            resolution: resToUse,
            aspectRatio,
            model: imgs.length > 1 ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview'
        }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate video.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-2">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Veo Video Studio
            </h2>
            <p className="text-gray-400">Cinematic video generation with character consistency.</p>
        </div>

        <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-6">
             {/* Prompt */}
             <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <label className="block text-sm font-medium text-gray-300">Prompt</label>
                    <button 
                        onClick={handleEnhancePrompt}
                        disabled={isEnhancing || !prompt}
                        className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-colors"
                    >
                        {isEnhancing ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
                        Magic Enhance
                    </button>
                </div>
                <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A neon hologram of a cat driving at top speed..."
                className="w-full bg-dark-900 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none"
                />
             </div>

             {/* Reference Images Selection */}
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-300">
                        Reference Assets ({selectedImages.length}/3)
                    </label>
                    {isMultiImage && !mergedImage && <span className="text-xs text-purple-400">Multi-ref: Merges to Master Frame</span>}
                </div>
                
                {/* Selected Images Preview Row */}
                {selectedImages.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto p-2 bg-dark-900 rounded-xl border border-gray-700/50">
                        {selectedImages.map((img, idx) => (
                            <div key={idx} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden group">
                                <img src={`data:image/png;base64,${img}`} className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-red-500/80 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Selection Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* 1. Character Library Quick Select */}
                     <div className="bg-dark-900/50 p-3 rounded-xl border border-white/5">
                        <span className="text-xs text-gray-500 mb-2 block">Select from Library</span>
                        {assets.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {assets.map(asset => {
                                    const isSelected = selectedImages.includes(asset.url.split(',')[1]);
                                    return (
                                        <button 
                                            key={asset.id}
                                            onClick={() => toggleAssetSelection(asset)}
                                            className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all relative ${isSelected ? 'border-purple-500 ring-1 ring-purple-500' : 'border-gray-700 hover:border-gray-500'}`}
                                            title={asset.name}
                                        >
                                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                                            {isSelected && <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center"><div className="w-2 h-2 bg-purple-500 rounded-full shadow-lg shadow-purple-500" /></div>}
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600 italic">No saved characters</div>
                        )}
                     </div>

                     {/* 2. Upload New */}
                     <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl cursor-pointer transition-colors h-full min-h-[80px] ${selectedImages.length >= 3 ? 'opacity-50 cursor-not-allowed border-gray-800' : 'border-gray-700 hover:border-purple-500 hover:bg-purple-500/5'}`}>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} disabled={selectedImages.length >= 3} className="hidden" />
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Upload Image</span>
                     </label>
                </div>
             </div>

             {/* Tags Input */}
             <div className="space-y-2">
                 <label className="block text-sm font-medium text-gray-300">Video Tags</label>
                 
                 {/* Smart Suggestions */}
                 {suggestedTags.length > 0 && (
                     <div className="mb-3">
                         <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">From your history</span>
                         <div className="flex flex-wrap gap-2">
                             {suggestedTags.map(tag => (
                                 <button
                                     key={tag}
                                     onClick={() => handleSmartTagClick(tag)}
                                     className={`px-2 py-1 text-xs rounded-md border transition-colors flex items-center gap-1 ${
                                         tags.includes(tag) 
                                         ? 'bg-purple-900/50 border-purple-500 text-purple-200' 
                                         : 'bg-dark-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                                     }`}
                                 >
                                     <TagIcon size={10} /> {tag}
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}

                 <div className="flex items-center gap-2 bg-dark-900 border border-gray-700 rounded-xl px-3 py-2">
                     {tags.map((t, i) => (
                         <span key={i} className="bg-purple-900/40 text-purple-300 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                             #{t} <button onClick={() => setTags(tags.filter((_, idx) => idx !== i))}><X size={12} /></button>
                         </span>
                     ))}
                     <input 
                        type="text" 
                        value={currentTag} 
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder={tags.length === 0 ? "Add video tags..." : ""}
                        className="bg-transparent outline-none text-sm flex-1 text-white"
                     />
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
                disabled={loading || (!prompt && selectedImages.length === 0)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-purple-900/20 hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Film className="w-5 h-5" />}
                {isMultiImage ? 'Merge & Animate (Cinema Grade)' : 'Generate Video'}
            </button>
        </div>
      </div>

      {/* Sidebar Settings & Character Library */}
      <div className="space-y-6">
          {/* Settings */}
          <div className="bg-dark-800 p-5 rounded-2xl border border-white/5">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Film className="w-4 h-4" /> Settings</h3>
              <div className="space-y-4">
                  <div>
                      <div className="flex justify-between mb-2">
                          <label className="text-xs text-gray-500 uppercase tracking-wider font-bold block">Resolution</label>
                          {isMultiImage && !mergedImage && <span className="text-[10px] text-amber-500 flex items-center gap-1"><AlertCircle size={10}/> 720p during Merge</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                          <button disabled={isMultiImage && !mergedImage} onClick={() => setResolution('720p')} className={`py-2 text-sm rounded-lg border transition-all disabled:opacity-50 ${resolution === '720p' ? 'bg-purple-600 border-purple-500 text-white' : 'border-gray-700 text-gray-400 hover:bg-white/5'}`}>720p</button>
                          <button disabled={isMultiImage && !mergedImage} onClick={() => setResolution('1080p')} className={`py-2 text-sm rounded-lg border transition-all disabled:opacity-50 ${resolution === '1080p' ? 'bg-purple-600 border-purple-500 text-white' : 'border-gray-700 text-gray-400 hover:bg-white/5'}`}>1080p</button>
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between mb-2">
                           <label className="text-xs text-gray-500 uppercase tracking-wider font-bold block">Aspect Ratio</label>
                           {isMultiImage && !mergedImage && <span className="text-[10px] text-amber-500 flex items-center gap-1"><AlertCircle size={10}/> Locked</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                          <button disabled={isMultiImage && !mergedImage} onClick={() => setAspectRatio('16:9')} className={`py-2 text-sm rounded-lg border transition-all disabled:opacity-50 ${aspectRatio === '16:9' ? 'bg-purple-600 border-purple-500 text-white' : 'border-gray-700 text-gray-400 hover:bg-white/5'}`}>16:9</button>
                          <button disabled={isMultiImage && !mergedImage} onClick={() => setAspectRatio('9:16')} className={`py-2 text-sm rounded-lg border transition-all disabled:opacity-50 ${aspectRatio === '9:16' ? 'bg-purple-600 border-purple-500 text-white' : 'border-gray-700 text-gray-400 hover:bg-white/5'}`}>9:16</button>
                      </div>
                  </div>
              </div>
          </div>

          {/* Character Library Widget */}
          <div className="bg-dark-800 p-5 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">Character Library</h3>
                  <button onClick={() => setShowAssetModal(true)} className="p-1.5 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors"><UserPlus size={16} /></button>
              </div>
              
              {assets.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-gray-700 rounded-xl">
                      <p className="text-gray-500 text-sm">No saved characters.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 gap-3">
                      {assets.map(asset => (
                          <div key={asset.id} className="group relative aspect-square rounded-lg overflow-hidden bg-dark-900 border border-gray-700">
                              <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                  <button onClick={(e) => handleDeleteAsset(asset.id, e)} className="self-end text-red-400 hover:text-white"><Trash2 size={14} /></button>
                                  <button onClick={() => toggleAssetSelection(asset)} className="text-xs font-bold text-center bg-white/20 backdrop-blur-sm rounded py-1 hover:bg-white/30">
                                      {selectedImages.includes(asset.url.split(',')[1]) ? 'Selected' : 'Use'}
                                  </button>
                              </div>
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-center truncate px-1 py-0.5">{asset.name}</div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>

      {/* New Asset Modal */}
      {showAssetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-dark-800 p-6 rounded-2xl max-w-sm w-full border border-white/10 space-y-4">
                  <h3 className="font-bold text-xl">Add Character</h3>
                  <input 
                    type="text" 
                    placeholder="Character Name (e.g. Neo)" 
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="w-full bg-dark-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-purple-500"
                  />
                  <div className="relative aspect-square bg-dark-900 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden">
                      {newAssetImage ? (
                          <img src={newAssetImage} className="w-full h-full object-cover" />
                      ) : (
                          <span className="text-gray-500 text-sm">Upload Image</span>
                      )}
                      <input type="file" onChange={(e) => handleImageUpload(e, true)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setShowAssetModal(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</button>
                      <button onClick={handleSaveAsset} disabled={!newAssetName || !newAssetImage} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* MERGE MASTER FRAME PREVIEW MODAL */}
      {showMergeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
              <div className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Sparkles className="text-purple-400" /> Master Frame Preview
                      </h3>
                      {!isMerging && <button onClick={() => setShowMergeModal(false)}><X className="text-gray-400 hover:text-white"/></button>}
                  </div>
                  
                  <div className="p-6 flex flex-col items-center justify-center min-h-[300px] bg-black/50">
                      {isMerging ? (
                          <div className="text-center space-y-4">
                              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto" />
                              <p className="text-gray-300 font-medium">Merging concepts...</p>
                              <p className="text-xs text-gray-500 max-w-md">Gemini is blending your reference images into a single cohesive master frame for optimal video quality.</p>
                          </div>
                      ) : mergedImage ? (
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden group border border-white/10">
                              <img src={mergedImage} className="w-full h-full object-cover" />
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Preview</div>
                          </div>
                      ) : (
                          <p className="text-red-400">Failed to generate preview.</p>
                      )}
                  </div>

                  <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                      {isMerging ? (
                          <span className="text-sm text-gray-500 py-2">Processing...</span>
                      ) : (
                          <>
                             <button 
                                 onClick={startMergeProcess}
                                 className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 flex items-center gap-2"
                             >
                                 <RefreshCcw size={16} /> Regenerate
                             </button>
                             <button 
                                 onClick={handleConfirmMerge}
                                 className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-lg hover:shadow-purple-500/20 flex items-center gap-2"
                             >
                                 <Check size={16} /> Approve & Animate (1080p)
                             </button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default VeoStudio;