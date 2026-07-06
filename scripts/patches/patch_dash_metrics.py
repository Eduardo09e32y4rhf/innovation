import re

file_path = 'apps/web/app/dashboard/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Enable notifications widget for employee
content = content.replace(
    'const notificationsWidget = useQuery(() => api.notifications.dashboardWidget(), [], { enabled: !isCommercial && !isFuncionario });',
    'const notificationsWidget = useQuery(() => api.notifications.dashboardWidget(), [], { enabled: !isCommercial, pollMs: 30000 });'
)

# Replace the MetricCards logic for isFuncionario
old_metrics = '''          <section className={grid grid-cols-1 gap-4 sm:grid-cols-2 }>
            <MetricCard 
              label="Funcionários ativos" 
              value={summaryData?.activeEmployees} 
              icon={Users} 
              detail="equipe em acompanhamento"
              trend={admissionsThisMonth > 0 ? + admissões : undefined}
              trendColor="emerald"
              loading={summary.loading}
            />
            <MetricCard 
              label="Pontos hoje" 
              value={summaryData?.timeTracksToday} 
              icon={Clock3} 
              detail="jornadas registradas"
              loading={summary.loading}
            />
            {!isFuncionario && ('''

new_metrics = '''          <section className={grid grid-cols-1 gap-4 sm:grid-cols-2 }>
            {isFuncionario ? (
              <>
                <MetricCard 
                  label="Banco de horas" 
                  value={summaryData ? formatMinutes(summaryData.totalTimeBalance) : undefined} 
                  icon={TrendingUp} 
                  detail={summaryData && summaryData.totalTimeBalance < 0 ? 'saldo negativo' : 'saldo positivo/extra'}
                  trendColor={summaryData && summaryData.totalTimeBalance < 0 ? 'rose' : 'emerald'}
                  alert={summaryData && summaryData.totalTimeBalance < 0}
                  loading={summary.loading}
                />
                <MetricCard 
                  label="Pontos hoje" 
                  value={summaryData?.timeTracksToday} 
                  icon={Clock3} 
                  detail="jornadas registradas"
                  loading={summary.loading}
                />
                <MetricCard 
                  label="Avisos" 
                  value={notificationWidgetData?.unreadCount ?? 0} 
                  icon={Bell} 
                  detail="notificações"
                  alert={(notificationWidgetData?.unreadCount ?? 0) > 0}
                  loading={notificationsWidget.loading}
                />
              </>
            ) : (
              <>
                <MetricCard 
                  label="Funcionários ativos" 
                  value={summaryData?.activeEmployees} 
                  icon={Users} 
                  detail="equipe em acompanhamento"
                  trend={admissionsThisMonth > 0 ? + admissões : undefined}
                  trendColor="emerald"
                  loading={summary.loading}
                />
                <MetricCard 
                  label="Pontos hoje" 
                  value={summaryData?.timeTracksToday} 
                  icon={Clock3} 
                  detail="jornadas registradas"
                  loading={summary.loading}
                />
              </>
            )}
            {!isFuncionario && ('''

content = content.replace(old_metrics, new_metrics)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Dashboard metrics patched')
