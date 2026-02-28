'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, Wrench, Info } from 'lucide-react';

interface BannerData {
    active: boolean;
    type: 'maintenance' | 'warning' | 'info';
    message: string;
    eta?: string;
}

const BANNER_STYLES = {
    maintenance: {
        bg: 'bg-gradient-to-r from-yellow-600/90 to-orange-600/90',
        border: 'border-yellow-500/30',
        icon: Wrench,
        iconColor: 'text-yellow-200',
    },
    warning: {
        bg: 'bg-gradient-to-r from-red-600/90 to-pink-600/90',
        border: 'border-red-500/30',
        icon: AlertTriangle,
        iconColor: 'text-red-200',
    },
    info: {
        bg: 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90',
        border: 'border-blue-500/30',
        icon: Info,
        iconColor: 'text-blue-200',
    },
};

export function MaintenanceBanner() {
    const [banner, setBanner] = useState<BannerData | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check for active maintenance banners
        const checkBanner = async () => {
            try {
                const response = await fetch('/api/system/status');
                if (response.ok) {
                    const data = await response.json();
                    if (data.maintenance_mode) {
                        setBanner({
                            active: true,
                            type: 'maintenance',
                            message: data.maintenance_message || 'Sistema em manutenção programada.',
                            eta: data.maintenance_eta,
                        });
                    }
                }
            } catch {
                // If health check fails entirely, show degraded banner
                // Don't show for network errors during initial load
            }
        };

        checkBanner();
        const interval = setInterval(checkBanner, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    if (!banner?.active || dismissed) return null;

    const style = BANNER_STYLES[banner.type];
    const Icon = style.icon;

    return (
        <div className={`fixed top-0 left-0 right-0 z-[100] ${style.bg} ${style.border} border-b backdrop-blur-xl`}>
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3">
                <Icon className={`w-4 h-4 ${style.iconColor} shrink-0 animate-pulse`} />
                <p className="text-sm text-white font-medium">
                    {banner.message}
                    {banner.eta && (
                        <span className="text-white/70 ml-2">(Previsão: {banner.eta})</span>
                    )}
                </p>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-white/60 hover:text-white transition ml-2 shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
