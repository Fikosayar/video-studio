import React from 'react';
import { CreationHistoryItem, MediaType } from '../types';
import { Film, Image as ImageIcon, Mic } from 'lucide-react';

interface HistoryGalleryProps {
  items: CreationHistoryItem[];
  onDeleteItem?: (id: string) => void;
}

const HistoryGallery: React.FC<HistoryGalleryProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 border border-dashed border-gray-700 rounded-xl bg-dark-800/50">
        <p>No creations yet.</p>
        <p className="text-sm">Start generating to populate your library.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.id} className="group relative aspect-square bg-dark-800 rounded-xl overflow-hidden border border-gray-800 hover:border-brand-500 transition-all">
          {item.type === MediaType.IMAGE && (
            <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
          )}
          {item.type === MediaType.VIDEO && (
             <video src={item.url} className="w-full h-full object-cover" controls />
          )}
          {item.type === MediaType.AUDIO && (
             <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <Mic className="w-12 h-12 text-brand-500" />
             </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
            <div className="flex items-center gap-1 text-xs text-brand-400 uppercase font-bold tracking-wider mb-1">
              {item.type === MediaType.IMAGE && <ImageIcon className="w-3 h-3" />}
              {item.type === MediaType.VIDEO && <Film className="w-3 h-3" />}
              {item.type}
            </div>
            <p className="text-white text-xs line-clamp-2">{item.prompt}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryGallery;