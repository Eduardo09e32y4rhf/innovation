import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"

type ReviewStatus = 'completed' | 'in-progress' | 'pending'
type BadgeVariant = 'success' | 'warning' | 'info' | 'default' | 'danger'

const statusVariantMap: Record<ReviewStatus, BadgeVariant> = {
  completed: 'success',
  'in-progress': 'warning',
  pending: 'info',
}

const statusLabelMap: Record<ReviewStatus, string> = {
  completed: 'Concluído',
  'in-progress': 'Em andamento',
  pending: 'Pendente',
}

const evaluations: Array<{
  id: string
  employee: string
  role: string
  date: string
  status: ReviewStatus
  score: number | null
  evaluator: string
}> = [
  {
    id: '1',
    employee: 'João Silva',
    role: 'Engenheiro de Software',
    date: '2026-08-15',
    status: 'completed',
    score: 4.5,
    evaluator: 'Ana Costa',
  },
  {
    id: '2',
    employee: 'Maria Oliveira',
    role: 'Gerente de Produto',
    date: '2026-09-01',
    status: 'pending',
    score: null,
    evaluator: 'Carlos Mendes',
  },
  {
    id: '3',
    employee: 'Pedro Santos',
    role: 'Designer UX/UI',
    date: '2026-09-10',
    status: 'in-progress',
    score: null,
    evaluator: 'Fernanda Lima',
  },
]

export default function PerformancePage() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Avaliação de Desempenho</h2>
        <Button variant="primary">Nova Avaliação</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {evaluations.map((ev) => (
          <Card key={ev.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg">{ev.employee}</CardTitle>
                <CardDescription>{ev.role}</CardDescription>
              </div>
              <Badge variant={statusVariantMap[ev.status]}>
                {statusLabelMap[ev.status]}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Data:</span>
                  <span className="font-medium text-foreground">{ev.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avaliador:</span>
                  <span className="font-medium text-foreground">{ev.evaluator}</span>
                </div>
                {ev.score && (
                  <div className="flex justify-between">
                    <span>Nota:</span>
                    <span className="font-medium text-foreground">{ev.score} / 5.0</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm">
                  {ev.status === 'completed' ? 'Ver Detalhes' : 'Continuar Avaliação'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
