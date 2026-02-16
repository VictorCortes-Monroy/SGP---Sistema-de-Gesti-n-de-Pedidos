import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { RequestForm } from '@/components/requests/request-form'

export default function NewRequestPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/solicitudes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Nueva Solicitud"
          description="Crea una nueva solicitud de pedido"
        />
      </div>

      <RequestForm />
    </div>
  )
}
