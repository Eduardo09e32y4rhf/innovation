'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface AIKey {
  id: string;
  key: string;
  type: 'static' | 'dynamic';
  status: 'active' | 'exhausted';
}

export default function AIKeyManager() {
  const [keys, setKeys] = useState<AIKey[]>([]);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/ai-admin/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (err) {
      console.error('Erro ao buscar chaves', err);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/ai-admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey })
      });

      if (res.ok) {
        setMessage({ text: 'Chave adicionada com sucesso!', type: 'success' });
        setNewKey('');
        fetchKeys();
      } else {
        setMessage({ text: 'Erro ao adicionar chave.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Falha na conexão.', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRemoveKey = async (keyId: string) => {
    if (!confirm('Deseja realmente remover/desativar esta chave?')) return;

    try {
      const res = await fetch(
        `/api/ai-admin/keys/${encodeURIComponent(keyId)}`,
        {
          method: 'DELETE'
        }
      );
      if (res.ok) {
        fetchKeys();
      }
    } catch (err) {
      console.error('Erro ao remover chave', err);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        'Isso resetará o status de TODAS as chaves para ATIVO. Continuar?'
      )
    )
      return;

    try {
      const res = await fetch('/api/ai-admin/keys/reset', { method: 'POST' });
      if (res.ok) {
        fetchKeys();
        setMessage({
          text: 'Todas as chaves foram resetadas!',
          type: 'success'
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error('Erro ao resetar chaves', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Key className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Gerenciador de Chaves IA
            </h3>
            <p className="text-xs text-slate-900/40 uppercase font-black tracking-widest">
              Controle de Tokens & Rotação
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-slate-900/60 hover:bg-white/10 hover:text-slate-900 transition-all uppercase"
        >
          <RefreshCw className="w-3 h-3" />
          Resetar Status
        </button>
      </div>

      <form onSubmit={handleAddKey} className="flex gap-3 mb-8">
        <input
          type="password"
          placeholder="Cole aqui a nova GEMINI_API_KEY..."
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50 transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </form>

      <div className="space-y-3">
        <AnimatePresence>
          {keys.map((k) => (
            <motion.div
              key={k.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-white/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-2 h-2 rounded-full ${k.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 opacity-50'}`}
                />
                <div>
                  <p className="text-sm font-mono text-slate-900/80">{k.key}</p>
                  <div className="flex gap-2 mt-1">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${k.type === 'static' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/20 text-blue-600'}`}
                    >
                      {k.type}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${k.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                    >
                      {k.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemoveKey(k.id)}
                className="p-2 rounded-lg bg-red-500/0 hover:bg-red-500/10 text-red-500/40 hover:text-red-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                aria-label="Remove AI key"
                title="Remove AI key"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-2xl shadow-2xl z-50 ${
              message.type === 'success'
                ? 'bg-green-500/20 border-green-500/50 text-green-200'
                : 'bg-red-500/20 border-red-500/50 text-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-bold">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
