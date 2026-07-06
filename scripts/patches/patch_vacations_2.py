import re

file_path = 'apps/web/app/dashboard/vacations/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the state tab type
content = content.replace(
    "const [tab, setTab] = useState<'active' | 'rejected' | 'history'>('active');",
    "const [tab, setTab] = useState<'active' | 'rejected' | 'history' | 'alerts'>('active');"
)

# 2. Add alertEmployees calculation
alert_calc = '''
  const alertEmployees = useMemo(() => {
    if (!employees.data) return [];
    return employees.data.map(emp => {
      if (!emp.admissionDate) return null;
      const el = calcEligibility(emp.admissionDate);
      if (!el || !el.isEligible) return null;
      const usedDays = vacationDaysByEmployee.get(emp.id) || 0;
      const totalEarned = Math.floor(el.monthsSinceAdmission / 12) * 30;
      const remainingDaysTotal = totalEarned - usedDays;
      if (remainingDaysTotal > 0) {
        return { ...emp, remainingDaysTotal, el };
      }
      return null;
    }).filter(Boolean);
  }, [employees.data, vacationDaysByEmployee]);
'''
content = content.replace(
    "const displayRows = tab === 'active' ? activeRows : tab === 'rejected' ? rejectedRows : historyRows;",
    alert_calc + "\n  const displayRows = tab === 'active' ? activeRows : tab === 'rejected' ? rejectedRows : historyRows;"
)

# 3. Add the Avisos button
tab_buttons = '''
            <button onClick={() => setTab('history')} className={ounded-[8px] px-4 py-2 text-xs font-black transition-all }>
              Histórico ({historyRows.length})
            </button>
            {canApprove && (
              <button onClick={() => setTab('alerts')} className={ounded-[8px] px-4 py-2 text-xs font-black transition-all flex items-center gap-1.5 }>
                <AlertTriangle size={13} strokeWidth={3} />
                Avisos ({alertEmployees.length})
              </button>
            )}
'''
content = content.replace(
    '''
            <button onClick={() => setTab('history')} className={ounded-[8px] px-4 py-2 text-xs font-black transition-all }>
              Histórico ({historyRows.length})
            </button>''',
    tab_buttons
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Tabs patched')
