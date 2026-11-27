'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { candidateApi, CANDIDATE_SESSION_EVENT, getCandidateToken, isUnauthorized, setCandidateToken } from './candidate-api';
const SAVED_KEY = 'innovation-careers-saved';
const SAVED_EVENT = 'candidate-saved-change';
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(CANDIDATE_SESSION_EVENT, listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener(CANDIDATE_SESSION_EVENT, listener); };
}
export function useCandidateToken() {
  const token = useSyncExternalStore<string | null | undefined>(subscribe, getCandidateToken, () => undefined);
  useEffect(() => {
    if (!token) return;
    let active = true;
    candidateApi.me().catch(error => { if (active && isUnauthorized(error)) setCandidateToken(null); });
    return () => { active = false; };
  }, [token]);
  return token;
}
export function useSavedJobs() {
  const token = useCandidateToken();
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string[]>([]);
  const current = useRef<string[]>([]);
  const locks = useRef(new Set<string>());
  const revision = useRef(0);
  const publish = useCallback((ids: string[], guest: boolean) => {
    const unique = [...new Set(ids)]; current.current = unique; setSaved(unique);
    if (guest) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(unique)); } catch { /* sem armazenamento persistente */ } }
  }, []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const version = ++revision.current;
      setLoading(true);
      try {
        const ids: unknown = token ? (await candidateApi.savedJobs()).jobs.map(job => job.id) : JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
        if (active && version === revision.current) { publish(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [], !token); setError(''); }
      } catch { if (active) setError('Não foi possível carregar suas vagas salvas.'); }
      finally { if (active) setLoading(false); }
    };
    publish([], false);
    void load();
    const sync = () => { if (!locks.current.size) void load(); };
    window.addEventListener(SAVED_EVENT, sync); window.addEventListener('storage', sync);
    return () => { active = false; window.removeEventListener(SAVED_EVENT, sync); window.removeEventListener('storage', sync); };
  }, [token, publish]);
  const toggleSaved = async (id: string) => {
    if (loading || locks.current.has(id)) return;
    locks.current.add(id); setPending([...locks.current]); ++revision.current;
    const had = current.current.includes(id);
    publish(had ? current.current.filter(item => item !== id) : [...current.current, id], !token);
    setError('');
    try {
      if (token) { if (had) await candidateApi.unsaveJob(id); else await candidateApi.saveJob(id); }
      window.dispatchEvent(new Event(SAVED_EVENT));
    } catch {
      publish(had ? [...current.current, id] : current.current.filter(item => item !== id), !token);
      setError('Não foi possível atualizar a vaga salva. Tente novamente.');
    } finally { locks.current.delete(id); setPending([...locks.current]); }
  };
  return { saved, toggleSaved, pending, loading, error };
}
