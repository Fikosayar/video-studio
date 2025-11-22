
import React, { useState, useEffect } from 'react';
import { Film, Loader2, AlertCircle, UserPlus, Trash2, Upload, Check, ArrowRight, Sparkles, ChevronLeft, PlayCircle, Settings, Layers, XCircle, PlusCircle, Volume2, VolumeX, Monitor, Smartphone } from 'lucide-react';
import { generateVideo, triggerKeySelection, mergeImages, enhancePrompt } from '../services/geminiService';
import { CreationHistoryItem, MediaType, Asset } from '../types';
import { getAssets, saveAsset, deleteAsset } from '../services/storageService';

interface VeoStudioProps {
  onSave: (item: CreationHistoryItem) => void;
  userId: string;
  history: CreationHistoryItem[];
}

const VeoStudio: React.FC<VeoStudioProps> = ({ onSave, userId, history }) => {
  const [step, setStep] = useState(0); // 0: Setup Scene, 1: Action
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  
  // Assets
  const [assets, setAssets] = useState<Asset[]>([]);
  
  // Selection State
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  
  // Production Settings
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [enableAudio, setEnableAudio] = useState(false); // Placeholder for future API support

  // UI Hints
  const [highlightLibrary, setHighlightLibrary] = useState(false);
  
  const selectedAssets = selectedAssetIds.map(id => assets.find(a => a.id === id)).filter(Boolean) as Asset[];

  // New Asset Modal State
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetImage, setNewAssetImage] = useState<string | null>(null);

  // Step 1: Action
  const [actionPrompt, setActionPrompt] = useState('');
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [masterFrame, setMasterFrame] = useState<string | null>(null);

  useEffect(() => {
    if (userId) getAssets(userId).then(setAssets);
  }, [userId]);

  // Asset Helpers
  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewAssetImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const saveNewAsset = async () => {
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
    
    if (selectedAssetIds.length < 2) {
        setSelectedAssetIds(prev => [...prev, asset.id]);
    }

    setShowAssetModal(false);
    setNewAssetName('');
    setNewAssetImage(null);
  };

  const handleDeleteAsset = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (selectedAssetIds.includes(id)) {
          setSelectedAssetIds(prev => prev.filter(sid => sid !== id));
      }
      const updated = await deleteAsset(userId, id);
      setAssets(updated);
  };

  const toggleAssetSelection = (assetId: string) => {
      if (selectedAssetIds.includes(assetId)) {
          setSelectedAssetIds(prev => prev.filter(id => id !== assetId));
      } else {
          if (selectedAssetIds.length < 2) {
              setSelectedAssetIds(prev => [...prev, assetId]);
          }
      }
  };

  const handleSlotClick = () => {
      if (assets.length === 0) {
          setShowAssetModal(true);
      } else {
          setHighlightLibrary(true);
          setTimeout(() => setHighlightLibrary(false), 600);
      }
  };

  const handleMagicEnhance = async () => {
      if (!actionPrompt) return;
      setLoading(true);
      try {
          const enhanced = await enhancePrompt(actionPrompt);
          setActionPrompt(enhanced);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleGenerate = async () => {
      const effectivePrompt = actionPrompt || "Cinematic movement"; 
      
      if (!effectivePrompt && selectedAssets.length === 0) {
          setError("Please provide an image or a prompt.");
          return;
      }

      setLoading(true);
      setError(null);
      setMasterFrame(null);

      try {
          if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
             await triggerKeySelection();
          }

          let finalImageReference: string[] = [];
          let finalPrompt = effectivePrompt;

          if (selectedAssets.length === 2) {
               setIsMerging(true);
               const rawSubject = selectedAssets[0].url.split(',')[1];
               const rawLocation = selectedAssets[1].url.split(',')[1];
               
               try {
                   // Master Frame (Prompt also includes context from user)
                   const masterFrameDataUrl = await mergeImages([rawSubject, rawLocation], `Context: ${effectivePrompt}`);
                   setMasterFrame(masterFrameDataUrl);
                   finalImageReference = [masterFrameDataUrl.split(',')[1]]; 
               } catch (mergeError) {
                   console.warn("Merge failed, falling back to raw assets", mergeError);
                   finalImageReference = [rawSubject, rawLocation];
               }
               setIsMerging(false);
          } else if (selectedAssets.length === 1) {
              finalImageReference = [selectedAssets[0].url.split(',')[1]];
              if (!actionPrompt) finalPrompt = "Animate the character in this image. High quality, cinematic.";
          }

          // Pass user settings (Resolution/AspectRatio) to generation logic
          // Note: If falling back to 2 raw assets, model enforces 720p inside service
          const videoUrl = await generateVideo({
              prompt: finalPrompt,
              images: finalImageReference,
              resolution: resolution, 
              aspectRatio: aspectRatio
          });

          setFinalVideo(videoUrl);
          
          onSave({
              id: crypto.randomUUID(),
              type: MediaType.VIDEO,
              url: videoUrl,
              prompt: finalPrompt,
              tags: [...selectedAssets.map(a => a.name), 'Veo Studio'],
              createdAt: Date.now(),
              metadata: { resolution: resolution, aspectRatio: aspectRatio, model: 'veo-3.1' }
          });

      } catch (e: any) {
          setError(e.message || "Generation failed");
      } finally {
          setLoading(false);
          setIsMerging(false);
      }
  };

  const steps = [
      { title: 'Setup Scene', icon: <Settings size={18} />, desc: 'Assets & Config' },
      { title: 'Action', icon: <PlayCircle size={18} />, desc: 'Direct & Produce' }
  ];

  return (
    <div className="max-w-6xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8 flex items-center justify-between bg-dark-800 p-4 rounded-2xl border border-white/5">
            {steps.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 ${i === step ? 'text-white' : 'text-gray-600'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${i === step ? 'border-purple-500 bg-purple-500/20 text-purple-400' : i < step ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-gray-700 bg-dark-900'}`}>
                        {i < step ? <Check size={16} /> : i + 1}
                    </div>
                    <div className="hidden md:block">
                        <p className="text-sm font-bold">{s.title}</p>
                        <p className="text-xs opacity-60">{s.desc}</p>
                    </div>
                    {i < steps.length - 1 && <div className="w-12 h-px bg-gray-800 mx-4 hidden md:block" />}
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Stage */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 min-h-[400px] flex flex-col">
                    
                    {/* STEP 0: SETUP SCENE */}
                    {step === 0 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            
                            {/* Asset Selection */}
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-white">Scene Assets</h2>
                                <button onClick={() => setShowAssetModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                                    <UserPlus size={16} /> Add Asset
                                </button>
                            </div>

                            <div className="border-2 border-dashed border-blue-500/30 bg-blue-500/5 rounded-2xl p-6 mb-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-white">Selected Assets</h3>
                                    <div className="px-2 py-1 bg-blue-900/20 text-blue-400 text-xs rounded-lg">
                                        {selectedAssets.length} / 2
                                    </div>
                                </div>
                                
                                <div className="flex gap-4">
                                    {/* Slot 1 */}
                                    {selectedAssets[0] ? (
                                        <div className="relative group cursor-pointer" onClick={() => toggleAssetSelection(selectedAssets[0].id)}>
                                            <div className="w-28 h-28 rounded-xl overflow-hidden border border-blue-500 relative shadow-lg shadow-blue-900/20">
                                                <img src={selectedAssets[0].url} className="w-full h-full object-cover" />
                                                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-center py-1 text-white font-bold uppercase">
                                                    Subject
                                                </div>
                                                <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Trash2 size={20} className="text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div 
                                            onClick={handleSlotClick}
                                            className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-600 bg-white/5 flex flex-col items-center justify-center text-gray-500 gap-2 hover:bg-white/10 hover:border-gray-400 transition-all cursor-pointer group"
                                        >
                                            <PlusCircle size={20} className="group-hover:text-blue-400" />
                                            <span className="text-[10px] font-medium text-center">Slot 1<br/>Subject</span>
                                        </div>
                                    )}

                                    {/* Slot 2 */}
                                     {selectedAssets[1] ? (
                                        <div className="relative group cursor-pointer" onClick={() => toggleAssetSelection(selectedAssets[1].id)}>
                                            <div className="w-28 h-28 rounded-xl overflow-hidden border border-purple-500 relative shadow-lg shadow-purple-900/20">
                                                <img src={selectedAssets[1].url} className="w-full h-full object-cover" />
                                                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-center py-1 text-white font-bold uppercase">
                                                    Location
                                                </div>
                                                 <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Trash2 size={20} className="text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div 
                                            onClick={handleSlotClick}
                                            className={`w-28 h-28 rounded-xl border-2 border-dashed border-gray-600 bg-white/5 flex flex-col items-center justify-center text-gray-500 gap-2 hover:bg-white/10 hover:border-gray-400 transition-all cursor-pointer group ${selectedAssets.length === 0 ? 'opacity-50' : ''}`}
                                        >
                                            <PlusCircle size={20} className="group-hover:text-purple-400" />
                                            <span className="text-[10px] font-medium text-center">Slot 2<br/>Location</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Library Grid */}
                            <div className={`grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[200px] overflow-y-auto scrollbar-thin pr-2 transition-all duration-300 ${highlightLibrary ? 'ring-2 ring-blue-500/50 rounded-xl bg-blue-500/5 p-2' : ''}`}>
                                {assets.map(asset => {
                                    const isSelected = selectedAssetIds.includes(asset.id);
                                    const isDisabled = !isSelected && selectedAssetIds.length >= 2;
                                    return (
                                        <button 
                                            key={asset.id}
                                            onClick={() => toggleAssetSelection(asset.id)}
                                            disabled={isDisabled}
                                            className={`relative aspect-square rounded-lg overflow-hidden border transition-all group ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-700 hover:border-gray-500'} ${isDisabled ? 'opacity-30' : ''}`}
                                        >
                                            <img src={asset.url} className="w-full h-full object-cover" />
                                            {isSelected && <div className="absolute top-1 left-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{selectedAssetIds.indexOf(asset.id) + 1}</div>}
                                        </button>
                                    );
                                })}
                                {assets.length === 0 && <p className="col-span-full text-center text-xs text-gray-500 py-4">No assets in library.</p>}
                            </div>
                            
                            {selectedAssets.length > 0 && (
                                <button onClick={() => setSelectedAssetIds([])} className="text-xs text-red-400 hover:underline mt-2 flex items-center gap-1"><XCircle size={12}/> Clear Selection</button>
                            )}

                            {/* PRODUCTION SETTINGS PANEL */}
                            <div className="mt-8 pt-6 border-t border-white/10">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Settings size={20} className="text-purple-400" /> Production Settings
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    
                                    {/* Resolution */}
                                    <div className="bg-dark-900 p-3 rounded-xl border border-gray-700">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Resolution</label>
                                        <div className="flex gap-1 bg-black rounded-lg p-1">
                                            <button onClick={() => setResolution('720p')} className={`flex-1 py-1.5 text-xs rounded font-medium ${resolution === '720p' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>720p</button>
                                            <button onClick={() => setResolution('1080p')} className={`flex-1 py-1.5 text-xs rounded font-medium ${resolution === '1080p' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>1080p</button>
                                        </div>
                                    </div>

                                    {/* Aspect Ratio */}
                                    <div className="bg-dark-900 p-3 rounded-xl border border-gray-700">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Format</label>
                                        <div className="flex gap-1 bg-black rounded-lg p-1">
                                            <button onClick={() => setAspectRatio('16:9')} className={`flex-1 py-1.5 text-xs rounded font-medium flex items-center justify-center gap-1 ${aspectRatio === '16:9' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                                <Monitor size={12} /> 16:9
                                            </button>
                                            <button onClick={() => setAspectRatio('9:16')} className={`flex-1 py-1.5 text-xs rounded font-medium flex items-center justify-center gap-1 ${aspectRatio === '9:16' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                                <Smartphone size={12} /> 9:16
                                            </button>
                                        </div>
                                    </div>

                                    {/* Audio (Toggle) */}
                                    <div className="bg-dark-900 p-3 rounded-xl border border-gray-700">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Audio Track</label>
                                        <button 
                                            onClick={() => setEnableAudio(!enableAudio)} 
                                            className={`w-full py-1.5 mt-1 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-colors ${enableAudio ? 'bg-green-900/30 border-green-500/50 text-green-400' : 'bg-black border-gray-800 text-gray-500'}`}
                                        >
                                            {enableAudio ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                            {enableAudio ? 'Enabled (Experimental)' : 'Muted'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setStep(1)} className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-transform hover:scale-105">
                                    Next: Director <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 1: ACTION (Same as before but renders final logic) */}
                    {step === 1 && (
                         <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Director's Chair</h2>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-2 py-1 rounded w-fit">
                                        <span>{resolution}</span> • <span>{aspectRatio}</span> • <span>{enableAudio ? 'Audio On' : 'Silent'}</span>
                                    </div>
                                </div>
                             </div>

                             {/* Context Summary */}
                             <div className="flex gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/5 items-center min-h-[80px]">
                                 {selectedAssets.length > 0 ? (
                                     selectedAssets.map((asset, i) => (
                                         <div key={i} className="flex flex-col items-center gap-1 relative animate-in zoom-in duration-200">
                                             <img src={asset.url} className={`w-12 h-12 rounded-lg object-cover border ${i===0 ? 'border-blue-500/50' : 'border-purple-500/50'}`} />
                                             <span className="text-[9px] text-gray-400 uppercase bg-black/50 px-1 rounded truncate max-w-[60px]">{asset.name}</span>
                                         </div>
                                     ))
                                 ) : <span className="text-xs text-gray-500 italic flex items-center gap-2"><AlertCircle size={14}/> Text-to-Video Mode</span>}
                                 
                                 {selectedAssets.length > 1 && (
                                     <div className="ml-auto px-3 py-1 bg-blue-900/20 text-blue-400 text-xs rounded-full border border-blue-900/50 flex items-center gap-1">
                                         <Layers size={12} /> Smart Merge
                                     </div>
                                 )}
                             </div>

                             <div className="relative">
                                 <textarea 
                                    value={actionPrompt}
                                    onChange={(e) => setActionPrompt(e.target.value)}
                                    placeholder="Describe the movement and camera action..."
                                    className="w-full bg-dark-900 border border-gray-700 rounded-xl p-4 text-white h-32 resize-none focus:border-blue-500 outline-none mb-2"
                                 />
                                 <button onClick={handleMagicEnhance} disabled={!actionPrompt || loading} className="absolute bottom-4 right-4 text-xs flex items-center gap-1 text-purple-400 bg-purple-900/20 px-2 py-1 rounded-lg">
                                    <Sparkles size={12} /> Enhance
                                 </button>
                             </div>
                             
                             {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
                             {isMerging && <div className="mb-4 p-3 bg-blue-900/20 text-blue-400 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Merging Composition...</div>}

                             <div className="mt-auto flex justify-between">
                                <button onClick={() => setStep(0)} className="flex items-center gap-2 px-6 py-3 text-gray-400 hover:text-white font-medium">
                                    <ChevronLeft size={16} /> Back
                                </button>
                                <button 
                                    onClick={handleGenerate} 
                                    disabled={loading || (!actionPrompt && selectedAssets.length === 0)}
                                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 hover:scale-[1.02]"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Film className="fill-white" />}
                                    {loading ? 'Producing...' : 'Generate Movie'}
                                </button>
                            </div>
                         </div>
                    )}
                </div>
            </div>

            {/* Preview / Result Sidebar */}
            <div className="bg-dark-800 p-6 rounded-3xl border border-white/5 h-fit">
                <h3 className="font-bold text-lg text-white mb-4">Studio Monitor</h3>
                
                {masterFrame && !finalVideo && (
                    <div className="mb-6 space-y-2 animate-in zoom-in duration-300">
                         <div className="flex items-center gap-2 text-xs text-blue-400 uppercase font-bold"><Layers size={12} /> Master Frame</div>
                         <img src={masterFrame} className="w-full rounded-lg border border-white/10" alt="Master Frame" />
                    </div>
                )}

                {finalVideo ? (
                    <div className="space-y-4 animate-in fade-in">
                        <video src={finalVideo} controls autoPlay loop className="w-full rounded-xl shadow-2xl border border-white/10" />
                        <a href={finalVideo} download="veo-movie.mp4" className="block w-full py-3 bg-white/10 hover:bg-white/20 text-center rounded-xl text-white font-medium transition-colors">Download</a>
                    </div>
                ) : (
                    <div className="aspect-video bg-black/50 rounded-xl border border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-600">
                         <Film size={32} className="mb-2 opacity-50" />
                         <p className="text-xs">Preview will appear here</p>
                    </div>
                )}
            </div>
        </div>

        {/* New Asset Modal */}
        {showAssetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
              <div className="bg-dark-800 p-6 rounded-2xl max-w-sm w-full border border-white/10 space-y-4">
                  <h3 className="font-bold text-xl text-white">New Asset</h3>
                  <input type="text" placeholder="Name" value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)} className="w-full bg-dark-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500" />
                  <div className="relative aspect-square bg-dark-900 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden group">
                      {newAssetImage ? <img src={newAssetImage} className="w-full h-full object-cover" /> : <div className="text-center"><Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" /><span className="text-gray-500 text-xs">Upload Photo</span></div>}
                      <input type="file" onChange={handleAssetUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setShowAssetModal(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white">Cancel</button>
                      <button onClick={saveNewAsset} disabled={!newAssetName || !newAssetImage} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50">Save</button>
                  </div>
              </div>
          </div>
        )}
    </div>
  );
};

export default VeoStudio;
