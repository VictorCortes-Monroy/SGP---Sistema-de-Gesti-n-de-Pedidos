import { useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, FileText, FileSpreadsheet, Paperclip } from 'lucide-react'
import { useRequest, useUploadRequestDocument } from '@/hooks/use-requests'
import { useAuthStore } from '@/stores/auth-store'
import { PageHeader } from '@/components/shared/page-header'
import { RequestStatusBadge } from '@/components/requests/request-status-badge'
import { RequestTimeline } from '@/components/requests/request-timeline'
import { RequestActions } from '@/components/requests/request-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { requestsApi } from '@/api/requests'
import type { PurchaseType } from '@/api/types'

const PURCHASE_TYPE_LABELS: Record<PurchaseType, string> = {
  INSUMOS: 'Insumos',
  ACTIVOS_FIJOS: 'Activos Fijos',
  OTROS_SERVICIOS: 'Otros Servicios',
}

function DocIcon({ mime }: { mime: string | null }) {
  if (mime?.includes('pdf')) return <FileText className="h-4 w-4 shrink-0 text-red-500" />
  if (mime?.includes('spreadsheet') || mime?.includes('excel') || mime?.includes('xls'))
    return <FileSpreadsheet className="h-4 w-4 shrink-0 text-green-600" />
  return <FileText className="h-4 w-4 shrink-0 text-blue-500" />
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: request, isLoading } = useRequest(id!)
  const uploadDocument = useUploadRequestDocument()
  const currentUser = useAuthStore((s) => s.user)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  if (isLoading) return <PageSkeleton />

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Solicitud no encontrada</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/solicitudes">Volver a solicitudes</Link>
        </Button>
      </div>
    )
  }

  const canUpload = request.status === 'DRAFT' && currentUser?.id === request.requester_id

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setIsUploading(true)
    await uploadDocument.mutateAsync({ id, file }).catch(() => {})
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/solicitudes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{request.title}</h1>
            <RequestStatusBadge status={request.status} />
            {request.purchase_type && (
              <Badge variant="outline">{PURCHASE_TYPE_LABELS[request.purchase_type] ?? request.purchase_type}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Creada el {formatDateTime(request.created_at)}
            {request.requester_name && ` por ${request.requester_name}`}
          </p>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Info + Items + Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {request.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Descripcion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{request.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Info card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacion</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Centro de Costo</dt>
                  <dd className="font-medium">{request.cost_center_name ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Monto Total</dt>
                  <dd className="font-medium">{formatCurrency(request.total_amount)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Solicitante</dt>
                  <dd className="font-medium">{request.requester_name ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tipo de Compra</dt>
                  <dd className="font-medium">
                    {request.purchase_type ? (PURCHASE_TYPE_LABELS[request.purchase_type] ?? request.purchase_type) : '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent>
              {request.items?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripcion</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {request.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-muted-foreground">{item.sku ?? '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Sin items</p>
              )}

              {request.items?.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="flex justify-end">
                    <span className="text-sm font-semibold">
                      Total: {formatCurrency(request.total_amount)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Documentos Adjuntos</CardTitle>
              {canUpload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Adjuntar archivo
                  </Button>
                </>
              )}
            </CardHeader>
            <CardContent>
              {!request.documents?.length ? (
                <p className="text-sm text-muted-foreground">Sin documentos adjuntos</p>
              ) : (
                <div className="space-y-2">
                  {request.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <DocIcon mime={doc.mime_type} />
                        <span className="truncate font-medium">{doc.file_name}</span>
                        {doc.file_size && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {formatFileSize(doc.file_size)}
                          </Badge>
                        )}
                        {doc.uploaded_by_name && (
                          <span className="shrink-0 text-xs text-muted-foreground hidden sm:inline">
                            {doc.uploaded_by_name}
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                        <a
                          href={requestsApi.getDocumentDownloadUrl(doc.id)}
                          download={doc.file_name}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Timeline + Actions */}
        <div className="space-y-6">
          <RequestActions request={request} />
          <RequestTimeline requestId={request.id} />
        </div>
      </div>
    </div>
  )
}
