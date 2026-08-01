'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { 
  ChevronLeft, ChevronRight, Search, CalendarDays, Users, List, 
  Clock, CheckCircle, AlertTriangle, AlertCircle, Calendar as CalendarIcon,
  Filter, X
} from 'lucide-react'

import { api } from '@/app/lib/api'
import { useAuth } from '@/app/contexts/AuthContext'
import { useQuery } from '@/app/hooks/use-data'
import { LoadingState, ErrorState, EmptyState } from '@/app/components/platform-ui'
import { formatMinutes } from '@/app/lib/format'
import { normalizeDisplayName } from '@/app/lib/text'

type ViewMode = 'meu_mes' | 'equipe' | 'lista'

// --- Utility Functions ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

const formatDateKey = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarioPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const isFuncionario = user?.role === 'FUNCIONARIO'

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>(isFuncionario ? 'meu_mes' : 'equipe')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedDay, setSelectedDay] = useState<{ date: string, employeeId: string | null } | null>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  // --- Queries ---

  // Meu Mês data
  const { data: myCalendarData, loading: loadingMyCalendar, error: errorMyCalendar } = useQuery(
    () => api.schedules.myCalendar(monthStr),
    ['myCalendar', monthStr]
  )
  const myCalendar = (myCalendarData || []) as any[]

  const { data: myTimeTrackData, loading: loadingMyTime, error: errorMyTime } = useQuery(
    () => api.timeTrack.listEmployeeMonth(user?.id || '', monthStr),
    ['myTimeTrack', user?.id, monthStr]
  )
  const myTimeTrack = (myTimeTrackData || []) as any[]

  // Equipe / Lista data
  const { data: teamScheduleData, loading: loadingTeamSchedule, error: errorTeamSchedule } = useQuery(
    () => api.schedules.teamSchedule(monthStr),
    ['teamSchedule', monthStr]
  )
  const teamSchedule = (teamScheduleData || []) as any[]

  const { data: teamTimeTrackData, loading: loadingTeamTime, error: errorTeamTime } = useQuery(
    () => api.timeTrack.list(monthStr),
    ['teamTimeTrack', monthStr]
  )
  const teamTimeTrack = (teamTimeTrackData || []) as any[]

  // Combine error and loading states
  const isLoading = loadingMyCalendar || loadingMyTime || loadingTeamSchedule || loadingTeamTime
  const error = errorMyCalendar || errorMyTime || errorTeamSchedule || errorTeamTime

  // --- Renderers ---

  const renderHeader = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="page-title">Calendário de Escalas</h1>
        <p className="page-subtitle">Acompanhe as jornadas e batidas de ponto</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-white rounded-lg p-1 border border-gray-200">
          <button
            onClick={() => setViewMode('meu_mes')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
              viewMode === 'meu_mes' ? 'bg-[#8A05BE] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Meu Mês</span>
          </button>
          {!isFuncionario && (
            <>
              <button
                onClick={() => setViewMode('equipe')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                  viewMode === 'equipe' ? 'bg-[#8A05BE] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Equipe</span>
              </button>
              <button
                onClick={() => setViewMode('lista')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                  viewMode === 'lista' ? 'bg-[#8A05BE] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  const renderToolbar = () => (
    <div className="card-flat mb-6 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={prevMonth} className="btn-icon">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 capitalize w-40 text-center">
          {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={nextMonth} className="btn-icon">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {(viewMode === 'equipe' || viewMode === 'lista') && (
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              className="form-control pl-9 w-full md:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderMeuMes = () => {
    if (isLoading) return <LoadingState label="Carregando calendário..." />
    if (error) return <ErrorState message="Erro ao carregar seu calendário." />

    const days = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    
    const blanks = Array.from({ length: firstDay }, (_, i) => i)
    const monthDays = Array.from({ length: days }, (_, i) => i + 1)

    const scheduleMap = new Map((myCalendar).map((d: any) => [d.date, d]))
    const trackMap = new Map((myTimeTrack).map((t: any) => [t.date, t]))

    return (
      <div className="card-flat overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="py-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {blanks.map(b => (
            <div key={`blank-${b}`} className="min-h-[120px] bg-gray-50/50 border-b border-r border-gray-100 p-2" />
          ))}
          {monthDays.map(day => {
            const dateStr = formatDateKey(year, month, day)
            const schedule = scheduleMap.get(dateStr)
            const track = trackMap.get(dateStr)

            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()
            let statusColor = 'bg-gray-100' // folga
            if (schedule && !track) statusColor = 'bg-yellow-50 border-yellow-200' // pendente/ausente
            if (track?.status === 'OK') statusColor = 'bg-green-50 border-green-200'
            if (track?.status === 'DIVERGENTE') statusColor = 'bg-red-50 border-red-200'

            return (
              <div 
                key={day} 
                onClick={() => setSelectedDay({ date: dateStr, employeeId: user?.id || null })}
                className={`min-h-[120px] border-b border-r border-gray-100 p-2 cursor-pointer hover:bg-gray-50 transition-colors relative border-l-4 ${statusColor} ${isToday ? 'bg-purple-50/30' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-semibold ${isToday ? 'text-[#8A05BE]' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  {track?.hasOccurrence && <AlertCircle className="w-4 h-4 text-orange-500" />}
                </div>
                
                {schedule && (
                  <div className="text-xs text-gray-500 mt-2 flex flex-col gap-1">
                    <span className="font-medium text-gray-700">{schedule.shiftName || 'Jornada'}</span>
                    <span>Previsto: {schedule.entryTime} - {schedule.exitTime}</span>
                  </div>
                )}
                
                {track && (
                  <div className="text-xs mt-2 p-1 bg-white rounded shadow-sm border border-gray-100">
                    <span className="font-medium text-gray-800">Realizado:</span><br/>
                    {track.records?.map((r: string) => r).join(' - ') || 'Sem batidas'}
                  </div>
                )}
                
                {!schedule && !track && (
                  <div className="text-xs text-gray-400 mt-2 italic">Folga / DSR</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderEquipe = () => {
    if (isLoading) return <LoadingState label="Carregando escala da equipe..." />
    if (error) return <ErrorState message="Erro ao carregar escala." />

    const days = getDaysInMonth(year, month)
    const monthDays = Array.from({ length: days }, (_, i) => i + 1)

    // filter employees based on search and dept
    let employees = Array.from(new Set([...(teamSchedule).map((s:any)=>s.employee), ...(teamTimeTrack).map((t:any)=>t.employee)]))

    return (
      <div className="card-flat overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-600 bg-gray-50 uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-gray-50 z-10 w-48 shadow-[1px_0_0_0_#e5e7eb]">Colaborador</th>
                {monthDays.map(d => (
                  <th key={d} className="px-2 py-3 text-center min-w-[40px] font-medium border-l border-gray-200">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan={days + 1} className="p-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
              ) : employees.map((emp: any, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e5e7eb] font-medium text-gray-800 truncate">
                    {emp?.name || 'Desconhecido'}
                  </td>
                  {monthDays.map(d => {
                    const dateStr = formatDateKey(year, month, d)
                    // Mock finding the status for the day
                    const status = Math.random() > 0.8 ? 'red' : Math.random() > 0.6 ? 'yellow' : 'green'
                    let bg = 'bg-green-400'
                    if (status === 'red') bg = 'bg-red-400'
                    if (status === 'yellow') bg = 'bg-yellow-400'

                    return (
                      <td key={d} className="px-1 py-2 border-l border-gray-100 cursor-pointer" onClick={() => setSelectedDay({ date: dateStr, employeeId: emp.id })}>
                         <div className="flex items-center justify-center h-full">
                           <div className={`w-3 h-3 rounded-full ${bg}`} title={`Dia ${d} - Status: ${status}`}></div>
                         </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderLista = () => {
    if (isLoading) return <LoadingState label="Carregando lista..." />

    const days = getDaysInMonth(year, month)
    const monthDays = Array.from({ length: days }, (_, i) => i + 1)
    
    // Extrai lista única de colaboradores
    const employeesMap = new Map()
    teamSchedule.forEach((s: any) => { if (s.employee) employeesMap.set(s.employee.id, s.employee) })
    teamTimeTrack.forEach((t: any) => { if (t.employee) employeesMap.set(t.employee.id, t.employee) })
    const employees = Array.from(employeesMap.values())
    
    // Filtro por texto
    const filteredEmployees = employees.filter(emp => 
      debouncedSearch ? emp.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) : true
    )

    return (
      <div className="space-y-6">
        {filteredEmployees.length === 0 ? (
          <EmptyState title="Nenhum colaborador encontrado" description="Ajuste sua busca e tente novamente." />
        ) : (
          filteredEmployees.map(emp => {
            const empSchedules = teamSchedule.filter((s:any) => s.employee?.id === emp.id)
            const empTracks = teamTimeTrack.filter((t:any) => t.employee?.id === emp.id)
            const scheduleMap = new Map(empSchedules.map((s:any) => [s.date, s]))
            const trackMap = new Map(empTracks.map((t:any) => [t.date, t]))
            
            return (
              <div key={emp.id} className="card-flat overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-800">{emp.name}</h3>
                </div>
                <div className="data-table-wrap max-h-96 overflow-y-auto">
                  <table className="data-table">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th className="w-24">Data</th>
                        <th>Previsto</th>
                        <th>Realizado</th>
                        <th>Saldo</th>
                        <th className="w-32">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthDays.map(d => {
                        const dateStr = formatDateKey(year, month, d)
                        const schedule = scheduleMap.get(dateStr)
                        const track = trackMap.get(dateStr)
                        
                        if (!schedule && !track) return null // Esconde dias sem escala e sem ponto
                        
                        const isDivergent = track?.status === 'DIVERGENTE' || (!track && schedule)
                        const batidas = [track?.entry, track?.lunchStart, track?.lunchReturn, track?.exit].filter(Boolean)
                        
                        return (
                          <tr key={d} className={isDivergent ? 'bg-red-50/20' : ''}>
                            <td className="font-medium">{String(d).padStart(2, '0')}/{String(month + 1).padStart(2, '0')}</td>
                            <td className="text-sm text-gray-600">
                              {schedule ? `${schedule.entryTime || '--:--'} às ${schedule.exitTime || '--:--'}` : <span className="italic text-gray-400">Folga</span>}
                            </td>
                            <td className="text-sm text-gray-800">
                              {batidas.length > 0 ? batidas.join(' - ') : <span className="text-gray-400">Sem batidas</span>}
                            </td>
                            <td className="text-sm">
                              {track?.dailyBalance ? (
                                <span className={track.dailyBalance > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {track.dailyBalance > 0 ? '+' : ''}{formatMinutes(track.dailyBalance)}
                                </span>
                              ) : '--'}
                            </td>
                            <td>
                              <span className={`badge ${isDivergent ? 'badge-alert' : 'badge-active'}`}>
                                {isDivergent ? 'Divergente' : 'OK'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-7xl mx-auto"
    >
      {renderHeader()}
      {renderToolbar()}
      
      {viewMode === 'meu_mes' && renderMeuMes()}
      {viewMode === 'equipe' && renderEquipe()}
      {viewMode === 'lista' && renderLista()}

      <AnimatePresence>
        {selectedDay && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#8A05BE]" />
                  Detalhes do Dia - {selectedDay.date.split('-').reverse().join('/')}
                </h3>
                <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-500">Colaborador</span>
                  <span className="text-gray-800 font-medium">{'Selecionado'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-500 block mb-1">Jornada Prevista</span>
                    <span className="font-medium text-gray-800">08:00 - 17:00</span>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="text-xs text-purple-600 block mb-1">Batidas Realizadas</span>
                    <span className="font-medium text-gray-800">08:02 - 12:00<br/>13:00 - 17:05</span>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-500 block mb-2">Ocorrências</span>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Atraso de 2 minutos</p>
                      <p className="text-xs text-yellow-600 mt-1">Pendente de justificativa</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button className="btn-outline" onClick={() => setSelectedDay(null)}>Fechar</button>
                <button className="btn-nubank">Ver Espelho Ponto</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
