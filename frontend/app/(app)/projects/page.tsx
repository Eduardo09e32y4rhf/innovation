'use client';

import AppLayout from '@/components/AppLayout';
import { Plus, Play, Square, Trash2, Loader2, Search, Filter, Calendar, Layout, ChevronRight, X, Clock, DollarSign, Rocket, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProjectService } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Task {
    id: number;
    title: string;
    description?: string;
    status?: string;
    project_id: number;
    estimated_hours: number;
    cost_per_hour: number;
}

interface Project {
    id: number;
    name: string;
    description?: string;
}

const COLUMNS = ['todo', 'in_progress', 'done'];
const COLUMN_LABELS: Record<string, string> = { todo: 'Backlog', in_progress: 'Produção', done: 'Concluído' };
const COLUMN_COLORS: Record<string, string> = { todo: 'bg-slate-100 text-slate-9000', in_progress: 'bg-indigo-50 text-indigo-600', done: 'bg-emerald-50 text-emerald-600' };

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTracking, setActiveTracking] = useState<Record<number, number>>({});
    const [showForm, setShowForm] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '' });
    const [newTask, setNewTask] = useState({ title: '', project_id: 0, estimated_hours: 1, cost_per_hour: 0 });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [p, t] = await Promise.all([ProjectService.getProjects(), ProjectService.getTasks()]);
            setProjects(p || []);
            setTasks(t || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const createProject = async () => {
        if (!newProject.name) return;
        await ProjectService.createProject(newProject);
        setNewProject({ name: '', description: '' });
        setShowForm(false);
        await loadData();
    };

    const createTask = async () => {
        if (!newTask.title || !newTask.project_id) return;
        await ProjectService.createTask({ ...newTask, status: 'todo' });
        setNewTask({ title: '', project_id: 0, estimated_hours: 1, cost_per_hour: 0 });
        await loadData();
    };

    const moveTask = async (taskId: number, newStatus: string) => {
        await ProjectService.updateTask(taskId, { status: newStatus });
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    };

    const handleTimeToggle = async (task: Task) => {
        if (activeTracking[task.id]) {
            await ProjectService.stopTimeTracking(activeTracking[task.id]);
            setActiveTracking(prev => { const n = { ...prev }; delete n[task.id]; return n; });
        } else {
            const entry = await ProjectService.startTimeTracking(task.id);
            setActiveTracking(prev => ({ ...prev, [task.id]: entry.id }));
        }
    };

    const getTasksByColumn = (col: string) => tasks.filter(t => t.status === col || (!t.status && col === 'todo'));

    return (
        <AppLayout title="Gestão de Projetos">
            <div className="p-8 space-y-8 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Projetos <span className="text-indigo-600">& Kanban</span></h1>
                        <p className="text-slate-9000 font-medium tracking-tight">Orquestração avançada de entregas e produtividade em tempo real.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all"
                        >
                            <Plus size={18} /> Novo Projeto
                        </button>
                    </div>
                </div>

                {/* KPI Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                            <Rocket size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Carga Horária</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">428h <span className="text-xs text-slate-700 font-bold tracking-normal italic uppercase">/mês</span></p>
                        </div>
                    </div>
                    <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Entregas</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">12 <span className="text-xs text-slate-700 font-bold tracking-normal italic uppercase">concluídas</span></p>
                        </div>
                    </div>
                    <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Backlog</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{tasks.length} <span className="text-xs text-slate-700 font-bold tracking-normal italic uppercase">pendentes</span></p>
                        </div>
                    </div>
                </div>

                {/* Add Task Bar */}
                {projects.length > 0 && (
                    <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm items-center">
                        <div className="relative flex-1 w-full">
                            <Plus className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                className="w-full bg-slate-50 border-transparent rounded-[1.5rem] px-12 py-4 text-sm font-medium focus:bg-white border-slate-200 border-black/5 shadow-sm focus:border-indigo-100 outline-none transition-all"
                                placeholder="Descreva a nova tarefa cognitivamente..."
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <select
                                className="flex-1 md:w-60 bg-slate-50 border border-transparent rounded-[1.5rem] px-6 py-4 text-xs font-black uppercase tracking-widest focus:bg-white focus:border-indigo-100 outline-none transition-all appearance-none text-slate-9000"

                                value={newTask.project_id}
                                onChange={e => setNewTask({ ...newTask, project_id: parseInt(e.target.value) })}
                            >
                                <option value={0}>Selecionar Projeto</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button onClick={createTask} className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-100 hover:scale-[1.05] active:scale-95 transition-all">
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Kanban Board */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-[600px] bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] animate-pulse" />)
                    ) : (
                        COLUMNS.map(col => (
                            <div key={col} className="bg-slate-50/50 border-slate-100 rounded-[2.5rem] p-6 flex flex-col min-h-[600px]">
                                <div className="flex items-center justify-between px-4 mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${col === 'todo' ? 'bg-slate-300' : col === 'in_progress' ? 'bg-indigo-600 animate-pulse' : 'bg-emerald-500'}`} />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{COLUMN_LABELS[col]}</h3>
                                    </div>
                                    <span className="bg-white border-slate-200 border-black/5 shadow-sm px-3 py-1 rounded-full text-[10px] font-black text-slate-400 border-slate-100">{getTasksByColumn(col).length}</span>
                                </div>

                                <div className="space-y-4 flex-1">
                                    {getTasksByColumn(col).map(task => (
                                        <motion.div
                                            layout
                                            key={task.id}
                                            className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-indigo-100/30 transition-all group cursor-move"
                                        >
                                            <p className="text-sm font-black text-slate-900 mb-2 leading-tight uppercase tracking-tight">{task.title}</p>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {task.estimated_hours}h</span>
                                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                <span className="flex items-center gap-1"><DollarSign size={12} /> {task.cost_per_hour}/h</span>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                <div className="flex gap-2">
                                                    {col !== 'todo' && (
                                                        <button onClick={() => moveTask(task.id, COLUMNS[COLUMNS.indexOf(col) - 1])} className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center">←</button>
                                                    )}
                                                    {col !== 'done' && (
                                                        <button onClick={() => moveTask(task.id, COLUMNS[COLUMNS.indexOf(col) + 1])} className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center">→</button>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleTimeToggle(task)}
                                                    className={`h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTracking[task.id] ? 'bg-rose-500 text-slate-900 shadow-lg shadow-rose-100' : 'bg-emerald-600 text-slate-900 shadow-lg shadow-emerald-100'}`}
                                                >
                                                    {activeTracking[task.id] ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                                    {activeTracking[task.id] ? 'Stop' : 'Play'}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Project Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-50/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-md p-10 rounded-[2.8rem] shadow-2xl relative" onClick={e => e.stopPropagation()}>

                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Novo Escopo</h2>
                                <button onClick={() => setShowForm(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100 transition-all" aria-label="Fechar modal"><X size={20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome do Projeto</label>
                                    <input type="text" className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 outline-none" placeholder="Ex: Site Institucional v2" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contexto / Descrição</label>
                                    <textarea rows={3} className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 outline-none resize-none" placeholder="Detalhes estratégicos..." value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} />
                                </div>

                                <button onClick={createProject} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.8rem] shadow-xl shadow-indigo-100 uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all mt-4">
                                    Criar Projeto Ativo
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
