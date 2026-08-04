import React from 'react';
import { 
  Download, 
  Globe, 
  X, 
  CheckCircle2, 
  Sparkles, 
  Code, 
  ExternalLink 
} from 'lucide-react';
import { downloadExtensionZip, generateExtensionFiles } from '../services/extensionGenerator';

interface ChromeExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChromeExtensionModal: React.FC<ChromeExtensionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { manifestJson } = generateExtensionFiles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 lg:p-8 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 flex items-center justify-center shadow-lg text-white">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              AI Job Hunter Manifest V3 Extension
            </h2>
            <p className="text-xs text-slate-400">
              Scrape job details directly from LinkedIn, Indeed, and Glassdoor into your workspace.
            </p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
          <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <Code className="w-3.5 h-3.5" /> Manifest V3 Source Files Bundle
          </h4>
          <pre className="text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            {manifestJson}
          </pre>
        </div>

        <div className="space-y-2 text-xs text-slate-300">
          <h4 className="font-bold text-white">Installation Instructions (Developer Mode):</h4>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
            <li>Click <strong>Download Extension Bundle</strong> below.</li>
            <li>Open Chrome and navigate to <code className="text-indigo-400">chrome://extensions</code></li>
            <li>Toggle <strong>Developer mode</strong> switch in the top right.</li>
            <li>Click <strong>Load unpacked</strong> and select the extension directory.</li>
          </ol>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
          >
            Close
          </button>
          <button
            onClick={downloadExtensionZip}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25"
          >
            <Download className="w-4 h-4" /> Download Extension Bundle
          </button>
        </div>
      </div>
    </div>
  );
};
