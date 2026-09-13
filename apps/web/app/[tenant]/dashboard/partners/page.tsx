import Link from 'next/link'
import { Plus, Building2, Users } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'

export default function PartnersPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parceiros e Fornecedores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie parceiros, fornecedores e suas informações.
          </p>
        </div>
        <Link
          href="partners/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar Parceiro
        </Link>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Nome / Razão Social</div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">CNPJ</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Contato</div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b transition-colors hover:bg-muted/50">
                <td className="p-4 align-middle" colSpan={4}>
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-16 gap-2">
                    <Building2 className="h-10 w-10 opacity-30" />
                    <p className="font-medium">Nenhum parceiro cadastrado.</p>
                    <p className="text-sm">Clique em &quot;Adicionar Parceiro&quot; para começar.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Exemplo de como ficará com dados — oculto por padrão */}
      <div className="hidden">
        <Badge variant="success">Ativo</Badge>
        <Badge variant="warning">Pendente</Badge>
        <Badge variant="danger">Bloqueado</Badge>
      </div>
    </div>
  )
}
