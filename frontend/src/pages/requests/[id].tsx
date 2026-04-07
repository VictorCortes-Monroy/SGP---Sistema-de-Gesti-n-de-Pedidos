import { useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Download, FileText, FileSpreadsheet, Paperclip, Image, X,
} from 'lucide-react'
import { useRequest, useUploadRequestDocument } from '@/hooks/use-requests'
import { useAuthStore } from '@/stores/auth-store'
import { PageHeader } from '@/components/shared/page-header'
import { RequestStatusBadge } from '@/components/requests/request-status-badge'
import { RequestStatusPipeline } from '@/components/requests/request-status-pipeline'
import { RequestTimeline } from '@/components/requests/request-timeline'
import { RequestActions } from '@/components/requests/request-actions'
import { PurchaseOrderDetail } from '@/components/requests/purchase-order-detail'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { canSeeFinancials } from '@/lib/constants'
import { requestsApi } from '@/api/requests'
import type { PurchaseType } from '@/api/types'

const PURCHASE_TYPE_LABELS: Record<PurchaseType, string> = {
  INSUMOS: 'Insumos',
  ACTIVOS_FIJOS: 'Activos Fijos',
  OTROS_SERVICIOS: 'Otros Servicios',
}

const ACCEPTED_FILES = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.bmp'

function DocIcon({ mime }: { mime: string | null }) {
  if (mime?.startsWith('image/'))
    return <Image className="h-4 w-4 shrink-0 text-purple-500" />
  if (mime?.includes('pdf'))
    return <FileText className="h-4 w-4 shrink-0 text-red-500" />
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

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED']

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: request, isLoading } = useRequest(id!)
  const uploadDocument = useUploadRequestDocument()
  const currentUser = useAuthStore((s) => s.user)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])

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

  const roleName = currentUser?.role_name
  const showFinancials = canSeeFinancials(roleName)
  const isOwner = currentUser?.id === request.requester_id
  const isAdmin = roleName === 'Admin'
  const canUpload =
    !TERMINAL_STATUSES.includes(request.status) &&
    (isAdmin || isOwner)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !id) return
    setIsUploading(true)
    setUploadingFiles(files.map((f) => f.name))
    for (const file of files) {
      await uploadDocument.mutateAsync({ id, file }).catch(() => {})
    }
    setIsUploading(false)
    setUploadingFiles([])
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

      {/* Status Pipeline — full width */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Estado de la Solicitud
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RequestStatusPipeline status={request.status} />
        </CardContent>
      </Card>

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
                {showFinancials && (
                  <div>
                    <dt className="text-muted-foreground">Monto Total</dt>
                    <dd className="font-medium">{formatCurrency(request.total_amount)}</dd>
                  </div>
                )}
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
                      {showFinancials && <TableHead className="text-right">Precio Unit.</TableHead>}
                      {showFinancials && <TableHead className="text-right">Subtotal</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {request.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{item.sku ?? '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        {showFinancials && <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>}
                        {showFinancials && (
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Sin items</p>
              )}

              {request.items?.length > 0 && showFinancials && (
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

          {/* Purchase Order Detail */}
          {['PURCHASING', 'RECEIVED_PARTIAL', 'RECEIVED_FULL', 'COMPLETED'].includes(request.status) && (
            <PurchaseOrderDetail requestId={request.id} />
          )}

          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Documentos Adjuntos</CardTitle>
              {canUpload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FILES}
                    multiple
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
                    {isUploading ? 'Subiendo...' : 'Adjuntar'}
                  </Button>
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Uploading progress */}
              {uploadingFiles.map((name) => (
                <div key={name} className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground animate-pulse">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="truncate">{name}</span>
                  <span className="ml-auto text-xs">Subiendo...</span>
                </div>
              ))}

              {!request.documents?.length && !uploadingFiles.length ? (
                <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                  <Paperclip className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Sin documentos adjuntos</p>
                  {canUpload && (
                    <p className="text-xs">
                      Formatos: PDF, Word, Excel, imágenes (JPG, PNG) · Máx. 10 MB
                    </p>
                  )}
                </div>
              ) : (
                request.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <DocIcon mime={doc.mime_type} />
                      <span className="truncate font-medium">{doc.file_name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {doc.file_size && (
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(doc.file_size)}
                          </Badge>
                        )}
                        {doc.mime_type && (
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                            {doc.mime_type.split('/')[1]?.toUpperCase() ?? doc.mime_type}
                          </Badge>
                        )}
                        {doc.uploaded_by_name && (
                          <span className="text-xs text-muted-foreground hidden md:inline">
                            {doc.uploaded_by_name}
                          </span>
                        )}
                      </div>
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
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Actions + Timeline */}
        <div className="space-y-6">
          <RequestActions request={request} />
          <RequestTimeline requestId={request.id} />
        </div>
      </div>
    </div>
  )
}
