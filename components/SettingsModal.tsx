
import React, { useState, useEffect } from 'react';
import { X, Webhook, Save, Check } from 'lucide-react';
import { getWebhookConfig, saveWebhookConfig } from '../services/webhookService';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = getWebhookConfig();
    setUrl(config.url);
    setEnabled(config.enabled);
  }, []);

  const handleSave = () => {
    saveWebhookConfig({ url, enabled });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-dark-800">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Webhook size={18} className="text-blue-400" /> Settings
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-2">Automation Webhook</h4>
            <p className="text-xs text-gray-500 mb-4">
              Automatically send generated assets (Images/Videos) to an external URL (n8n, Zapier, Make) via HTTP POST.
            </p>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/5 rounded-lg border border-white/5 hover:border-blue-500/50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={enabled} 
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-5 h-5 rounded accent-blue-500"
                />
                <span className="text-sm text-gray-300">Enable Webhook Trigger</span>
              </label>

              <div className="space-y-1">
                <label className="text-xs text-gray-500">Webhook URL (POST)</label>
                <input 
                  type="url" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-n8n-instance.com/webhook/..."
                  disabled={!enabled}
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex justify-end bg-dark-800">
          <button 
            onClick={handleSave}
            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
              saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Saved' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
