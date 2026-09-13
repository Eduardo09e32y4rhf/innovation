import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"

// Mock data for evaluations
const evaluations = [
  {
    id: "1",
    employee: "John Doe",
    role: "Software Engineer",
    date: "2026-08-15",
    status: "completed",
    score: 4.5,
    evaluator: "Jane Smith",
  },
  {
    id: "2",
    employee: "Alice Johnson",
    role: "Product Manager",
    date: "2026-09-01",
    status: "pending",
    score: null,
    evaluator: "Bob Williams",
  },
  {
    id: "3",
    employee: "Michael Brown",
    role: "UI/UX Designer",
    date: "2026-09-10",
    status: "in-progress",
    score: null,
    evaluator: "Sarah Davis",
  },
]

export default function PerformanceReviewsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Performance Reviews</h2>
        <div className="flex items-center space-x-2">
          <Button>New Evaluation</Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {evaluations.map((evaluation) => (
          <Card key={evaluation.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl">{evaluation.employee}</CardTitle>
                <CardDescription>{evaluation.role}</CardDescription>
              </div>
              <Badge 
                variant={
                  evaluation.status === 'completed' ? 'default' : 
                  evaluation.status === 'in-progress' ? 'secondary' : 'outline'
                }
              >
                {evaluation.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-medium text-foreground">{evaluation.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Evaluator:</span>
                  <span className="font-medium text-foreground">{evaluation.evaluator}</span>
                </div>
                {evaluation.score && (
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-medium text-foreground">{evaluation.score} / 5.0</span>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="outline" size="sm">
                  {evaluation.status === 'completed' ? 'View Details' : 'Continue Evaluation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
