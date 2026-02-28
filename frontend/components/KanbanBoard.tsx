'use client';

import { useState, useCallback } from 'react';
import { GripVertical, Plus, X, Loader2 } from 'lucide-react';

export interface KanbanTicket {
    id: number;
    title: string;
    status: string;
    priority?: string;
    created_at?: string;
    sla_breached?: boolean;
}

export interface KanbanColumn {
    id: string;
    label: string;
    color: string;
    tickets: KanbanTicket[];
}

interface KanbanBoardProps {
    columns: KanbanColumn[];
    onMove: (ticketId: number, newQueue: string) => Promise<void>;
    loading?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
    urgent: 'border-l-red-500 bg-red-500/5',
    high: 'border-l-orange-500 bg-orange-500/5',
    normal: 'border-l-blue-500 bg-blue-500/5',
    low: 'border-l-gray-500 bg-gray-500/5',
};

const SLA_BADGE = 'text-xs px-2 py-0.5 rounded-full font-medium';

export function KanbanBoard({ columns, onMove, loading = false }: KanbanBoardProps) {
    const [dragging, setDragging] = useState<KanbanTicket | null>(null);
    const [draggingOver, setDraggingOver] = useState<string | null>(null);
    const [movingId, setMovingId] = useState<number | null>(null);

    const handleDragStart = useCallback((ticket: KanbanTicket) => {
        setDragging(ticket);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        setDraggingOver(columnId);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        setDraggingOver(null);

        if (!dragging || dragging.status === targetColumnId) {
            setDragging(null);
            return;
        }

        setMovingId(dragging.id);
        try {
            await onMove(dragging.id, targetColumnId);
        } finally {
            setMovingId(null);
            setDragging(null);
        }
    }, [dragging, onMove]);

    const handleDragEnd = useCallback(() => {
        setDragging(null);
        setDraggingOver(null);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((col) => (
                <div
                    key={col.id}
                    className={`flex-shrink-0 w-64 transition-all duration-200 ${draggingOver === col.id ? 'scale-[1.02]' : ''
                        }`}
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDrop={(e) => handleDrop(e, col.id)}
                    onDragLeave={() => setDraggingOver(null)}
                >
                    {/* Column Header */}
                    <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-xl border ${col.color}`}>
                        <span className="font-bold text-sm text-white">{col.label}</span>
                        <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded-full">
                            {col.tickets.length}
                        </span>
                    </div>

                    {/* Drop Zone */}
                    <div
                        className={`min-h-[200px] rounded-xl border-2 border-dashed transition-all duration-200 p-2 space-y-2 ${draggingOver === col.id
                                ? 'border-purple-500/60 bg-purple-500/10'
                                : 'border-gray-800 bg-gray-900/30'
                            }`}
                    >
                        {col.tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-24 text-gray-600 text-xs">
                                <Plus className="w-6 h-6 mb-1 opacity-30" />
                                Arraste aqui
                            </div>
                        ) : (
                            col.tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    draggable
                                    onDragStart={() => handleDragStart(ticket)}
                                    onDragEnd={handleDragEnd}
                                    className={`relative border-l-4 border rounded-r-xl p-3 cursor-grab active:cursor-grabbing transition-all duration-150 group ${PRIORITY_COLORS[ticket.priority ?? 'normal'] ?? PRIORITY_COLORS.normal
                                        } ${dragging?.id === ticket.id ? 'opacity-40 scale-95' : 'hover:shadow-lg hover:scale-[1.01]'} border-gray-800/50`}
                                >
                                    {/* Moving indicator */}
                                    {movingId === ticket.id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-r-xl z-10">
                                            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs text-gray-200 font-medium leading-tight flex-1">{ticket.title}</p>
                                        <GripVertical className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        {ticket.priority && (
                                            <span className={`${SLA_BADGE} ${ticket.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                                    ticket.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-gray-700 text-gray-400'
                                                }`}>
                                                {ticket.priority}
                                            </span>
                                        )}
                                        {ticket.sla_breached && (
                                            <span className={`${SLA_BADGE} bg-red-900/40 text-red-400 ml-auto`}>
                                                ⚠ SLA
                                            </span>
                                        )}
                                    </div>

                                    {ticket.created_at && (
                                        <p className="text-[10px] text-gray-600 mt-1">
                                            {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Standalone Kanban Page Wrapper ─────────────────────────────────────────
export function useKanban() {
    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const fetchQueues = useCallback(async () => {
        const token = getToken();
        if (!token) { window.location.href = '/login'; return null; }
        const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE}/api/support/v2/queues`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) { window.location.href = '/login'; return null; }
        if (!res.ok) return null;
        return res.json() as Promise<Record<string, { count: number; sla_hours: number; tickets: KanbanTicket[] }>>;
    }, []);

    const moveTicket = useCallback(async (ticketId: number, queue: string) => {
        const token = getToken();
        if (!token) return;
        const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        await fetch(`${BASE}/api/support/v2/tickets/${ticketId}/assign-queue?queue=${queue}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
        });
    }, []);

    return { fetchQueues, moveTicket };
}
