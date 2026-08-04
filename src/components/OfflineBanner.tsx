import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, X } from 'lucide-react';

interface OfflineBannerProps {
  queueCount?: number;
  onRetryQueue?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ queueCount = 0, onRetryQueue }) => {
  const [isOnline, setIsOnline]     = useState(navigator.onLine);
  const [dismissed, setDismissed]   = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      setJustReconnected(true);
      // Auto-hide "reconnected" banner after 4 seconds
      setTimeout(() => setJustReconnected(false), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
      setJustReconnected(false);
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Nothing to show when online and not just-reconnected
  if (isOnline && !justReconnected) return null;
  if (dismissed) return null;

  // ── Just Reconnected Banner ────────────────────────────────────────────────
  if (justReconnected) {
    return (
      <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-xl shadow-lg text-xs text-emerald-300 font-semibold pointer-events-auto animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Back online — live job feed resumed</span>
          {queueCount > 0 && onRetryQueue && (
            <button
              onClick={onRetryQueue}
              className="ml-2 px-2.5 py-1 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 font-bold text-[10px] transition-colors"
            >
              Retry {queueCount} queued {queueCount === 1 ? 'application' : 'applications'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Offline Banner ─────────────────────────────────────────────────────────
  return (
    <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/35 backdrop-blur-xl shadow-lg text-xs font-semibold pointer-events-auto animate-in slide-in-from-top-2">
        <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
        <span className="text-amber-200">
          Offline Mode — showing cached jobs
          {queueCount > 0 && (
            <span className="ml-1.5 text-amber-300">
              · {queueCount} {queueCount === 1 ? 'application' : 'applications'} queued
            </span>
          )}
        </span>
        {onRetryQueue && queueCount > 0 && (
          <button
            onClick={onRetryQueue}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 transition-colors"
            title="Retry queued applications"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="ml-1 p-1 rounded-lg text-amber-400/60 hover:text-amber-300 transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
