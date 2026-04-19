'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { SystemConfigService } from '@/lib/api';

interface Announcement {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'danger';
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [closed, setClosed] = useState<number[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await SystemConfigService.getAnnouncements();
        setAnnouncements(data);
      } catch (error) {
        console.error('Error fetching announcements:', error);
      }
    };
    fetchAnnouncements();
  }, []);

  const visibleAnnouncements = announcements.filter(
    (a) => !closed.includes(a.id)
  );

  if (visibleAnnouncements.length === 0) return null;

  const getColors = (type: string) => {
    switch (type) {
      case 'danger':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'warning':
        return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'danger':
        return <AlertCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      {visibleAnnouncements.map((a) => (
        <motion.div
          key={a.id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`relative w-full border-b backdrop-blur-md z-[100] ${getColors(a.type)}`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0">{getIcon(a.type)}</div>
              <p className="text-xs font-semibold tracking-wide">{a.message}</p>
            </div>
            <button
              onClick={() => setClosed([...closed, a.id])}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Fechar anúncio"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {a.type === 'danger' && (
            <motion.div
              className="absolute inset-0 bg-red-500/5 -z-10"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
