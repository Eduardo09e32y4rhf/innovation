import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"

export default function TimeTrackingPage() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Batida de Ponto</h1>
      </div>
      <div className="flex justify-center items-center flex-1 mt-10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Registrar Ponto</CardTitle>
            <CardDescription>
              Registre sua entrada, saída ou intervalo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pb-12">
            <div className="text-4xl font-mono font-bold mb-8">
              --:--
            </div>
            <Button size="lg" className="h-40 w-40 rounded-full flex flex-col items-center justify-center text-xl gap-2 shadow-lg transition-transform hover:scale-105">
              <Clock className="w-10 h-10" />
              <span>Bater Ponto</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
