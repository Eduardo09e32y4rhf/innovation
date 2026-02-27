'use client';

import AppLayout from '../../components/AppLayout';

export default function AnalyticsPage() {
    const metabaseUrl = process.env.NEXT_PUBLIC_METABASE_URL || 'http://187.77.49.207:3030';

    return (
        <AppLayout title="Analytics & BI">
            <div className="flex flex-col h-full bg-[#050508] text-white">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        Business Intelligence
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Dashboards estratégicos em tempo real via Metabase</p>
                </div>
                <div className="flex-1 w-full h-full p-4">
                    <iframe
                        src={metabaseUrl}
                        className="w-full h-full rounded-2xl border border-gray-800 bg-gray-900"
                        frameBorder="0"
                        allowTransparency
                    />
                </div>
            </div>
        </AppLayout>
    );
}
