import React, { useState, useEffect } from 'react';
import { CreationHistoryItem, MediaType } from '../types';
import { Film, Image as ImageIcon, X, Maximize2, Trash2, Tag, Calendar, Edit2, Check } from 'lucide-react';

interface HistoryGalleryProps {
  items: CreationHistoryItem[];
  onDeleteItem?: (id: string) => void;
  onUpdateItem?: (id: string, updates: Partial<CreationHistoryItem>) => void;
}

const HistoryGallery: React.FC<HistoryGalleryProps> = ({ items, onDeleteItem, onUpdateItem }) => {
  const [filter, setFilter] = useState<'ALL' | 'IMAGE' | 'VIDEO'>('ALL');
  const [selectedItem, setSelectedItem] = useState<CreationHistoryItem | null>(null);
  
  // Editing state for tags
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editTagsValue, setEditTagsValue] = useState('');

  useEffect(() => {
      if (selectedItem) {
          setEditTagsValue(selectedItem.tags.join(', '));
      }
  }, [selectedItem]);

  const filteredItems = items.filter(item => 
    filter === 'ALL' ? true : item.type === filter
  );

  const handleSaveTags = () => {
      if (!selectedItem || !onUpdateItem) return;
      const newTags = editTagsValue.split(',').map(t => t.trim()).filter(Boolean);
      onUpdateItem(selectedItem.id, { tags: newTags });
      setSelectedItem({ ...selectedItem, tags: newTags });
      setIsEditingTags(false);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl bg-dark-800/30">
        <div className="bg-dark-800 p-4 rounded-full mb-4">
          <ImageIcon className="w-8 h-8 text-gray-600" />
        </div>
        <p className="text-lg font-medium text-gray-400">No creations yet</p>
        <p className="text-sm text-gray-600">Visit a studio to start creating</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 bg-dark-800/50 p-1 rounded-xl w-fit border border-white/5">
        {(['ALL', 'IMAGE', 'VIDEO'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f 
                ? 'bg-white text-black shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {f === 'ALL' ? 'All Assets' : f === 'IMAGE' ? 'Images' : 'Videos'}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {filteredItems.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedItem(item)}
            className="group relative aspect-square bg-dark-800 rounded-2xl overflow-hidden border border-white/5 hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/10 transition-all cursor-pointer"
          >
            {item.type === MediaType.IMAGE && (
              <img src={item.url} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            )}
            {item.type === MediaType.VIDEO && (
               <video src={item.url} className="w-full h-full object-cover" />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-4 flex flex-col justify-end">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    {item.type === MediaType.IMAGE ? <ImageIcon size={10} /> : <Film size={10} />}
                    {item.type}
                  </span>
                  {item.metadata?.aspectRatio && (
                     <span className="text-[10px] text-gray-300 border border-white/20 px-1.5 py-0.5 rounded">{item.metadata.aspectRatio}</span>
                  )}
                </div>
                <Maximize2 className="w-4 h-4 text-white/80" />
              </div>
              <p className="text-white text-sm font-medium line-clamp-2 leading-snug mb-2">{item.prompt}</p>
              
              {/* Mini Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {item.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="text-[10px] text-brand-300 bg-brand-900/50 px-1.5 py-0.5 rounded-full">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-full max-w-6xl max-h-[90vh] flex flex-col md:flex-row gap-8 bg-dark-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
             {/* Media View */}
             <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
                {selectedItem.type === MediaType.IMAGE && (
                   <img src={selectedItem.url} alt={selectedItem.prompt} className="max-w-full max-h-[80vh] object-contain" />
                )}
                {selectedItem.type === MediaType.VIDEO && (
                   <video src={selectedItem.url} controls autoPlay className="max-w-full max-h-[80vh]" />
                )}
             </div>

             {/* Details Sidebar */}
             <div className="w-full md:w-96 bg-dark-900 p-6 flex flex-col border-l border-white/5 overflow-y-auto">
                <div className="mb-6">
                   <div className="flex items-center gap-2 text-brand-400 text-xs font-bold tracking-wider uppercase mb-2">
                      {selectedItem.type === MediaType.IMAGE ? <ImageIcon size={14} /> : <Film size={14} />}
                      Generated via {selectedItem.metadata?.model || 'Gemini'}
                   </div>
                   <h3 className="text-xl font-bold text-white mb-4">Creation Details</h3>
                   
                   <div className="space-y-4">
                      <div className="bg-dark-800 p-4 rounded-xl border border-white/5">
                         <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Prompt</h4>
                         <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.prompt}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div className="bg-dark-800 p-3 rounded-xl border border-white/5">
                            <span className="text-xs text-gray-500 block mb-1">Date</span>
                            <div className="flex items-center gap-2 text-sm text-gray-200">
                               <Calendar size={14} />
                               {new Date(selectedItem.createdAt).toLocaleDateString()}
                            </div>
                         </div>
                         <div className="bg-dark-800 p-3 rounded-xl border border-white/5">
                            <span className="text-xs text-gray-500 block mb-1">Resolution</span>
                            <span className="text-sm text-gray-200">{selectedItem.metadata?.resolution || 'Native'}</span>
                         </div>
                         {selectedItem.metadata?.aspectRatio && (
                            <div className="bg-dark-800 p-3 rounded-xl border border-white/5">
                                <span className="text-xs text-gray-500 block mb-1">Aspect Ratio</span>
                                <span className="text-sm text-gray-200">{selectedItem.metadata.aspectRatio}</span>
                            </div>
                         )}
                      </div>
                   </div>
                </div>

                {/* Editable Tags */}
                <div className="mb-auto">
                   <div className="flex items-center justify-between mb-3">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                          <Tag size={14} /> Tags
                      </h4>
                      {!isEditingTags ? (
                          <button 
                             onClick={() => setIsEditingTags(true)}
                             className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                             title="Edit Tags"
                          >
                             <Edit2 size={14} />
                          </button>
                      ) : (
                          <div className="flex gap-2">
                              <button 
                                 onClick={() => setIsEditingTags(false)}
                                 className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                              >
                                 <X size={14} />
                              </button>
                              <button 
                                 onClick={handleSaveTags}
                                 className="p-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-white transition-colors"
                              >
                                 <Check size={14} />
                              </button>
                          </div>
                      )}
                   </div>
                   
                   {isEditingTags ? (
                       <div className="space-y-2">
                           <input 
                              type="text"
                              value={editTagsValue}
                              onChange={(e) => setEditTagsValue(e.target.value)}
                              className="w-full bg-dark-800 border border-gray-600 rounded-lg p-2 text-sm text-white focus:border-brand-500 outline-none"
                              placeholder="Separate tags with commas..."
                              autoFocus
                           />
                           <p className="text-[10px] text-gray-500">Comma separated (e.g. cyberpunk, neon, cat)</p>
                       </div>
                   ) : (
                       <div className="flex flex-wrap gap-2">
                          {selectedItem.tags && selectedItem.tags.length > 0 ? (
                            selectedItem.tags.map((tag, i) => (
                               <span key={i} className="px-3 py-1 rounded-full bg-brand-900/30 text-brand-300 border border-brand-500/20 text-xs">
                                  #{tag}
                               </span>
                            ))
                          ) : (
                            <span className="text-gray-600 text-sm italic">No tags added</span>
                          )}
                       </div>
                   )}
                </div>

                {/* Actions */}
                <div className="pt-6 mt-6 border-t border-white/10 flex flex-col gap-3">
                   <a 
                     href={selectedItem.url} 
                     download={`gemini-creation-${selectedItem.id}`}
                     className="w-full py-3 bg-white text-black rounded-xl font-bold text-center hover:bg-gray-200 transition-colors"
                   >
                      Download Asset
                   </a>
                   {onDeleteItem && (
                     <button 
                        onClick={() => {
                           onDeleteItem(selectedItem.id);
                           setSelectedItem(null);
                        }}
                        className="w-full py-3 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-900/40 transition-colors"
                     >
                        <Trash2 size={16} /> Delete
                     </button>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryGallery;