import React, { useState, useRef } from 'react';
import { Wand2, Upload, ArrowRight, Loader2 } from 'lucide-react';
import { editImage } from '../services/geminiService';
import { CreationHistoryItem, MediaType } from '../types';

interface MagicEditorProps {
  onSave: (item: CreationHistoryItem) => void;
}

const MagicEditor: React.FC<MagicEditorProps> = ({ onSave }) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [prompt, setPrompt] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
         const res = reader.result as string;
         setOriginalImage(res);
         setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!originalImage || !prompt) return;
    setLoading(true);
    
    try {
      // Remove data URL prefix for API
      const base64Data = originalImage.split(',')[1];
      
      const editedDataUrl = await editImage({
        imageBase64: base64Data,
        mimeType,
        prompt
      });
      
      setResultImage(editedDataUrl);
      
      onSave({
        id: crypto.randomUUID(),
        type: MediaType.IMAGE,
        url: editedDataUrl,
        prompt: `Edit: ${prompt}`,
        tags: [],
        createdAt: Date.now()
      });
    } catch (e) {
      console.error(e);
      alert("Failed to edit image. Ensure your prompt is clear.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col gap-6">
      <div className="text-center mb-4">
         <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            Magic Editor
         </h2>
         <p className="text-gray-400">Upload a photo and tell Gemini how to change it.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
         {/* Source */}
         <div className="flex-1 w-full bg-dark-800 p-4 rounded-xl border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Original</h3>
            <div className="relative aspect-square bg-dark-900 rounded-lg overflow-hidden border-2 border-dashed border-gray-700 flex items-center justify-center group">
               {originalImage ? (
                 <img src={originalImage} className="w-full h-full object-contain" alt="Original" />
               ) : (
                 <div className="text-center p-6">
                    <Upload className="w-10 h-10 mx-auto text-gray-500 mb-2" />
                    <p className="text-gray-500 text-sm">Click to upload</p>
                 </div>
               )}
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpload} accept="image/*" />
            </div>
         </div>

         {/* Controls */}
         <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0 self-center">
            <textarea
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="Ex: 'Add a vintage filter', 'Make it sunset', 'Add a cat in the corner'..."
               className="w-full bg-dark-800 border border-gray-700 rounded-xl p-3 text-white h-32 resize-none focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleEdit}
              disabled={!originalImage || !prompt || loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
               {loading ? <Loader2 className="animate-spin" /> : <Wand2 className="w-5 h-5" />}
               Apply Magic
            </button>
         </div>

         {/* Result */}
         <div className="flex-1 w-full bg-dark-800 p-4 rounded-xl border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Result</h3>
             <div className="relative aspect-square bg-dark-900 rounded-lg overflow-hidden border border-gray-700 flex items-center justify-center">
               {resultImage ? (
                 <img src={resultImage} className="w-full h-full object-contain" alt="Result" />
               ) : (
                 <div className="text-gray-600 text-sm">Result will appear here</div>
               )}
             </div>
         </div>
      </div>
    </div>
  );
};

export default MagicEditor;