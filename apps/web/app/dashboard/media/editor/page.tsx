'use client';
import React, { useState } from 'react';
import { Camera, Crop, Sparkles, Image as ImageIcon, Check, RotateCw, Wand2 } from 'lucide-react';

const PhotoEditorPage = () => {
  const [selectedFilter, setSelectedFilter] = useState('none');

  return (
<div className="max-w-6xl mx-auto py-10 animate-in fade-in duration-700">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Editor de Perfil Pro</h1>
            <p className="text-gray-400">Transforme sua foto comum em um headshot profissional via IA.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 grad-bg rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-purple-500/20">
            <Check size={20} /> Salvar Foto
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Visualização da Foto */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass aspect-square rounded-[40px] flex items-center justify-center overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                <p className="text-xs text-white/80 font-medium">Pré-visualização em tempo real</p>
              </div>
              
              {/* Espaço para a imagem */}
              <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center text-gray-700">
                <ImageIcon size={64} className="mb-4 opacity-20" />
                <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Selecione uma imagem</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                <Camera size={18} /> Tirar Foto
              </button>
              <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                <RotateCw size={18} /> Girar
              </button>
              <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                <Crop size={18} /> Cortar
              </button>
            </div>
          </div>

          {/* Painel de Ferramentas IA */}
          <div className="lg:col-span-1 space-y-8">
            <div className="glass p-8 rounded-3xl border-purple-500/30">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Wand2 className="text-purple-400" /> Magia da IA</h3>
              <div className="space-y-4">
                <button className="w-full py-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-sm font-bold text-purple-400 hover:bg-purple-500 hover:text-white transition-all flex items-center justify-center gap-2">
                   <Sparkles size={16} /> Trocar Fundo (Escritório)
                </button>
                <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-gray-300 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                   Melhorar Iluminação
                </button>
              </div>
            </div>

            <div className="glass p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-6">Filtros Profissionais</h3>
              <div className="grid grid-cols-2 gap-4">
                <FilterOption name="Original" active={selectedFilter === 'none'} onClick={() => setSelectedFilter('none')} />
                <FilterOption name="P&B Pro" active={selectedFilter === 'bw'} onClick={() => setSelectedFilter('bw')} />
                <FilterOption name="Estúdio" active={selectedFilter === 'studio'} onClick={() => setSelectedFilter('studio')} />
                <FilterOption name="Quente" active={selectedFilter === 'warm'} onClick={() => setSelectedFilter('warm')} />
              </div>
            </div>
          </div>
        </div>
      </div>
);
};

const FilterOption = ({ name, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`p-4 rounded-2xl border transition-all text-[10px] font-bold uppercase tracking-widest ${active ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'}`}
  >
    {name}
  </button>
);

export default PhotoEditorPage;

