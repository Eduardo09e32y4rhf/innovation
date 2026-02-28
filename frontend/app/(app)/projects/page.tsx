'use client';

import { Sidebar } from '@/components/Sidebar';
import { Plus, Play, Square, Trash2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProjectService } from '@/services/api';

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
const COLUMN_LABELS: Record<string, string> = { todo: 'Backlog', in_progress: 'Em Progresso', done: 'Concluído' };
const COLUMN_COLORS: Record<string, string> = { todo: 'text-gray-400', in_progress: 'text-blue-400', done: 'text-green-400' };

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
        try {
            const [p, t] = await Promise.all([ProjectService.getProjects(), ProjectService.getTasks()]);
            setProjects(p);
            setTasks(t);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const createProject = async () => {
        if (!newProject.name) return;
        await ProjectService.createProject(newProject);
        setNewProject({ name: '', description: '' });
        setShowForm(false);
        loadData();
    };

    const createTask = async () => {
        if (!newTask.title || !newTask.project_id) return;
        await ProjectService.createTask({ ...newTask, status: 'todo' });
        setNewTask({ title: '', project_id: 0, estimated_hours: 1, cost_per_hour: 0 });
        loadData();
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
        <div className="flex h-screen bg-[#0a0a0f] text-white overflow-hidden">
            <Sidebar />
            <main className="flex-1 ml-[280px] p-8 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
                        Gestão de Projetos
                    </h1>
                    <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition">
                        <Plus className="w-4 h-4" /> Novo Projeto
                    </button>
                </div>

                {showForm && (
                    <div className="mb-6 p-6 bg-zinc-900 border border-zinc-700 rounded-2xl grid grid-cols-2 gap-4">
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" placeholder="Nome do Projeto" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} />
                            <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" placeholder="Descrição" value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} />
                        </div>
                        <button onClick={createProject} className="col-span-2 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition">Criar Projeto</button>
                    </div>
                )}

                {/* Add Task */}
                {projects.length > 0 && (
                    <div className="mb-6 flex gap-3">
                        <input className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" placeholder="Título da tarefa..." value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                        <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" value={newTask.project_id} onChange={e => setNewTask({ ...newTask, project_id: parseInt(e.target.value) })}>
                            <option value={0}>Projeto...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button onClick={createTask} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {COLUMNS.map(col => (
                            <div key={col} className="glass-panel p-4 rounded-xl min-h-[500px]">
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`font-semibold ${COLUMN_COLORS[col]}`}>{COLUMN_LABELS[col]}</span>
                                    <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs text-gray-500">{getTasksByColumn(col).length}</span>
                                </div>
                                <div className="space-y-3">
                                    {getTasksByColumn(col).map(task => (
                                        <div key={task.id} className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700 hover:border-blue-500/50 transition">
                                            <p className="text-sm font-medium text-gray-200 mb-2">{task.title}</p>
                                            <p className="text-xs text-gray-500 mb-3">{task.estimated_hours}h · R${task.cost_per_hour}/h</p>
                                            <div className="flex gap-2">
                                                {col !== 'todo' && (
                                                    <button onClick={() => moveTask(task.id, COLUMNS[COLUMNS.indexOf(col) - 1])} className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition">←</button>
                                                )}
                                                {col !== 'done' && (
                                                    <button onClick={() => moveTask(task.id, COLUMNS[COLUMNS.indexOf(col) + 1])} className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition">→</button>
                                                )}
                                                <button
                                                    onClick={() => handleTimeToggle(task)}
                                                    className={`text-xs px-2 py-1 rounded transition flex items-center gap-1 ${activeTracking[task.id] ? 'bg-red-600 hover:bg-red-500' : 'bg-green-700 hover:bg-green-600'}`}
                                                >
                                                    {activeTracking[task.id] ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                    {activeTracking[task.id] ? 'Stop' : 'Play'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
