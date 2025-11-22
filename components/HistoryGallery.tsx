
import React, { useState, useEffect } from 'react';
import { CreationHistoryItem, MediaType, Album } from '../types';
import { Film, Image as ImageIcon, X, Maximize2, Trash2, Tag, Calendar, Edit2, Check, Folder, Plus, FolderOpen, ArrowRight } from 'lucide-react';
import { getAlbums, createAlbum, deleteAlbum, getHistory, updateHistoryItem } from '../services/storageService';

interface HistoryGalleryProps {
  items: CreationHistoryItem[];
  onDeleteItem?: (id: string) => void;
  onUpdateItem?: (id: string, updates: Partial<CreationHistoryItem>) => void;
}

const HistoryGallery: React.FC<HistoryGalleryProps> = ({ items, onDeleteItem, onUpdateItem }) => {
  const [view, setView] = useState<'ALL' | 'ALBUMS'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'IMAGE' | 'VIDEO'>('ALL');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedItem, setSelectedItem] = useState<CreationHistoryItem | null>(null);
  
  // Tag Editing
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editTagsValue, setEditTagsValue] = useState('');

  // New Album Input
  const [newAlbumName, setNewAlbumName] = useState('');
  const [showNewAlbumInput, setShowNewAlbumInput] = useState(false);

  // Album Selection in Lightbox
  const [showAlbumMover, setShowAlbumMover] = useState(false);

  // Load Albums
  useEffect(() => {
      // Since we don't have user ID prop easily here without prop drilling, we rely on local storage
      // For this implementation, let's fetch albums when items update (User loaded)
      const uId = localStorage.getItem('gemini_studio_user') ? JSON.parse(localStorage.getItem('gemini_studio_user')!).id : null;
      if (uId) {
          getAlbums(uId).then(setAlbums);
      }
  }, [items]);

  // Filter Logic
  const filteredItems = items.filter(item => {
    const typeMatch = filterType === 'ALL' ? true : item.type === filterType;
    const albumMatch = selectedAlbum ? item.albumId === selectedAlbum.id : true;
    return typeMatch && albumMatch;
  });

  useEffect(() => {
      if (selectedItem) {
          setEditTagsValue(selectedItem.tags.join(', '));
      }
  }, [selectedItem]);

  const handleSaveTags = () => {
      if (!selectedItem || !onUpdateItem) return;
      const newTags = editTagsValue.split(',').map(t => t.trim()).filter(Boolean);
      onUpdateItem(selectedItem.id, { tags: newTags });
      setSelectedItem({ ...selectedItem, tags: newTags });
      setIsEditingTags(false);
  };

  const handleCreateAlbum = async () => {
      if (!newAlbumName.trim()) return;
      const uId = JSON.parse(localStorage.getItem('gemini_studio_user')!).id;
      const updated = await createAlbum(uId, newAlbumName);
      setAlbums(updated);
      setNewAlbumName('');
      setShowNewAlbumInput(false);
  };

  const handleDeleteAlbum = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Delete this album? Items inside will remain in 'All Assets'.")) {
          const uId = JSON.parse(localStorage.getItem('gemini_studio_user')!).id;
          const updated = await deleteAlbum(uId, id);
          setAlbums(updated);
          if (selectedAlbum?.id === id) setSelectedAlbum(null);
      }
  };

  const handleMoveToAlbum = (albumId: string | undefined) => {
      if (!selectedItem || !onUpdateItem) return;
      onUpdateItem(selectedItem.id, { albumId: albumId }); // undefined removes it
      setSelectedItem({ ...selectedItem, albumId: albumId });
      setShowAlbumMover(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full min-h-[600px]">
      
      {/* SIDEBAR */}
      <div className="w-full md:w-64 shrink-0 space-y-6">
          <div className="bg-dark-800 rounded-xl p-2 space-y-1 border border-white/5">
             <button 
                onClick={() => { setView('ALL'); setSelectedAlbum(null); setFilterType('ALL'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${view === 'ALL' && !selectedAlbum && filterType === 'ALL' ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
             >
                <FolderOpen size={16} /> All Assets
             </button>
             <button 
                onClick={() => { setView('ALL'); setSelectedAlbum(null); setFilterType('IMAGE'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${filterType === 'IMAGE' ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
             >
                <ImageIcon size={16} /> Images
             </button>
             <button 
                onClick={() => { setView('ALL'); setSelectedAlbum(null); setFilterType('VIDEO'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${filterType === 'VIDEO' ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
             >
                <Film size={16} /> Videos
             </button>
          </div>

          <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Albums</h3>
                <button onClick={() => setShowNewAlbumInput(true)} className="text-gray-400 hover:text-white"><Plus size={16} /></button>
             </div>
             
             {showNewAlbumInput && (
                 <div className="mb-3 flex gap-2">
                     <input 
                       autoFocus
                       type="text" 
                       value={newAlbumName} 
                       onChange={(e) => setNewAlbumName(e.target.value)} 
                       className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none"
                       placeholder="Name..."
                       onKeyDown={(e) => e.key === 'Enter' && handleCreateAlbum()}
                     />
                     <button onClick={handleCreateAlbum} className="text-green-400"><Check size={14}/></button>
                     <button onClick={() => setShowNewAlbumInput(false)} className="text-red-400"><X size={14}/></button>
                 </div>
             )}

             <div className="space-y-1">
                 {albums.map(album => (
                     <div key={album.id} className="group flex items-center justify-between">
                         <button
                            onClick={() => { setView('ALBUMS'); setSelectedAlbum(album); }}
                            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors truncate ${selectedAlbum?.id === album.id ? 'bg-blue-900/30 text-blue-300' : 'text-gray-400 hover:text-white'}`}
                         >
                             <Folder size={14} className={selectedAlbum?.id === album.id ? "text-blue-400" : "text-gray-600"} /> 
                             {album.name}
                         </button>
                         <button onClick={(e) => handleDeleteAlbum(e, album.id)} className="p-2 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity">
                             <Trash2 size={12} />
                         </button>
                     </div>
                 ))}
                 {albums.length === 0 && !showNewAlbumInput && (
                     <p className="text-xs text-gray-600 italic text-center py-2">No albums created</p>
                 )}
             </div>
          </div>
      </div>

      {/* GRID CONTENT */}
      <div className="flex-1">
         <div className="mb-6 flex items-center gap-2">
             <h2 className="text-2xl font-bold text-white">
                 {selectedAlbum ? selectedAlbum.name : (filterType === 'ALL' ? 'Library' : filterType === 'IMAGE' ? 'Images' : 'Videos')}
             </h2>
             {selectedAlbum && <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-md border border-blue-900/50">Album</span>}
         </div>

         {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl bg-dark-800/30">
               <p>No items found here.</p>
            </div>
         ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map((item) => (
                <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className="group relative aspect-square bg-dark-800 rounded-xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all cursor-pointer"
                >
                    {item.type === MediaType.IMAGE && (
                    <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                    )}
                    {item.type === MediaType.VIDEO && (
                    <video src={item.url} className="w-full h-full object-cover" />
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-3 flex flex-col justify-end">
                       <p className="text-white text-xs font-medium line-clamp-2">{item.prompt}</p>
                    </div>
                </div>
                ))}
            </div>
         )}
      </div>

      {/* LIGHTBOX */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-full max-w-6xl h-[90vh] flex flex-col md:flex-row gap-0 bg-dark-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
             {/* Media View */}
             <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
                {selectedItem.type === MediaType.IMAGE && (
                   <img src={selectedItem.url} alt={selectedItem.prompt} className="max-w-full max-h-full object-contain" />
                )}
                {selectedItem.type === MediaType.VIDEO && (
                   <video src={selectedItem.url} controls autoPlay className="max-w-full max-h-full" />
                )}
             </div>

             {/* Details Sidebar */}
             <div className="w-full md:w-96 bg-dark-900 p-6 flex flex-col border-l border-white/5 overflow-y-auto">
                <div className="mb-6 space-y-4">
                   <h3 className="text-xl font-bold text-white">Details</h3>
                   
                   <div className="bg-dark-800 p-4 rounded-xl border border-white/5">
                      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Prompt</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.prompt}</p>
                   </div>

                   {/* Album Manager */}
                   <div className="bg-dark-800 p-4 rounded-xl border border-white/5">
                       <div className="flex justify-between items-center mb-2">
                           <h4 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Album</h4>
                           <button onClick={() => setShowAlbumMover(!showAlbumMover)} className="text-blue-400 hover:text-blue-300 text-xs">
                               {showAlbumMover ? 'Cancel' : 'Change'}
                           </button>
                       </div>
                       
                       {showAlbumMover ? (
                           <div className="space-y-1 max-h-32 overflow-y-auto">
                               <button onClick={() => handleMoveToAlbum(undefined)} className="w-full text-left px-2 py-1.5 text-sm text-gray-400 hover:bg-white/5 rounded">None (Remove)</button>
                               {albums.map(a => (
                                   <button 
                                      key={a.id} 
                                      onClick={() => handleMoveToAlbum(a.id)}
                                      className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white/5 ${selectedItem.albumId === a.id ? 'text-blue-400 bg-blue-900/20' : 'text-white'}`}
                                   >
                                       {a.name}
                                   </button>
                               ))}
                           </div>
                       ) : (
                           <div className="flex items-center gap-2 text-sm text-white">
                               <Folder size={14} className="text-gray-500" />
                               {albums.find(a => a.id === selectedItem.albumId)?.name || 'Uncategorized'}
                           </div>
                       )}
                   </div>

                   {/* Tags */}
                   <div>
                      <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Tags</h4>
                          {!isEditingTags ? (
                              <button onClick={() => setIsEditingTags(true)} className="text-gray-400 hover:text-white"><Edit2 size={12}/></button>
                          ) : (
                              <div className="flex gap-2">
                                  <button onClick={() => setIsEditingTags(false)} className="text-red-400"><X size={14}/></button>
                                  <button onClick={handleSaveTags} className="text-green-400"><Check size={14}/></button>
                              </div>
                          )}
                      </div>
                      
                      {isEditingTags ? (
                           <input 
                              type="text"
                              value={editTagsValue}
                              onChange={(e) => setEditTagsValue(e.target.value)}
                              className="w-full bg-dark-800 border border-gray-600 rounded-lg p-2 text-sm text-white outline-none"
                           />
                       ) : (
                           <div className="flex flex-wrap gap-2">
                              {selectedItem.tags && selectedItem.tags.length > 0 ? (
                                selectedItem.tags.map((tag, i) => (
                                   <span key={i} className="px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-gray-300">#{tag}</span>
                                ))
                              ) : (
                                <span className="text-gray-600 text-sm italic">No tags</span>
                              )}
                           </div>
                       )}
                   </div>
                </div>

                <div className="mt-auto space-y-3 pt-6 border-t border-white/10">
                   <a 
                     href={selectedItem.url} 
                     download={`gemini-asset-${selectedItem.id}`}
                     className="block w-full py-3 bg-white text-black rounded-xl font-bold text-center hover:bg-gray-200"
                   >
                      Download
                   </a>
                   {onDeleteItem && (
                     <button 
                        onClick={() => { onDeleteItem(selectedItem.id); setSelectedItem(null); }}
                        className="w-full py-3 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl font-medium hover:bg-red-900/40"
                     >
                        Delete
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
