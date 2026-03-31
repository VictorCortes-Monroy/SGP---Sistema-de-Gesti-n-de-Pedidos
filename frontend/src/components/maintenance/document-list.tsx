import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Download, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import apiClient from '@/api/client'

const DOCUMENT_TYPES = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'] as const
type DocType = typeof DOCUMENT_TYPES[number]

const DOC_LABELS: Record<DocType, string> = {
    D1: 'D1 — Solicitud / OC',
    D2: 'D2 — Cotización Proveedor',
    D3: 'D3 — Confirmación Proveedor',
    D4: 'D4 — Programación Transporte',
    D5: 'D5 — Cierre Operativo',
    D6: 'D6 — Certificado Mantención',
    D7: 'D7 — Confirmación Pago',
}

const DOC_COLORS: Record<DocType, string> = {
    D1: 'bg-gray-100 text-gray-700',
    D2: 'bg-yellow-100 text-yellow-800',
    D3: 'bg-blue-100 text-blue-700',
    D4: 'bg-cyan-100 text-cyan-800',
    D5: 'bg-orange-100 text-orange-800',
    D6: 'bg-purple-100 text-purple-800',
    D7: 'bg-green-100 text-green-800',
}

interface MaintDoc {
    id: string
    document_type: DocType
    file_name: string
    file_size: number | null
    mime_type: string | null
    notes: string | null
    uploaded_by_name: string | null
    uploaded_at: string | null
}

async function fetchDocuments(requestId: string): Promise<MaintDoc[]> {
    const { data } = await apiClient.get(`/maintenance/requests/${requestId}/documents`)
    return data
}

async function uploadDocument(requestId: string, file: File, documentType: DocType, notes?: string): Promise<MaintDoc> {
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams({ document_type: documentType })
    if (notes) params.append('notes', notes)
    const { data } = await apiClient.post(
        `/maintenance/requests/${requestId}/documents?${params.toString()}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
}

function formatBytes(bytes: number | null) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentListProps {
    requestId: string
}

export function DocumentList({ requestId }: DocumentListProps) {
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [openUpload, setOpenUpload] = useState(false)
    const [selectedType, setSelectedType] = useState<DocType>('D1')
    const [notes, setNotes] = useState('')
    const [pendingFile, setPendingFile] = useState<File | null>(null)

    const { data: docs = [], isLoading } = useQuery({
        queryKey: ['maint-documents', requestId],
        queryFn: () => fetchDocuments(requestId),
    })

    const upload = useMutation({
        mutationFn: ({ file, type, notes }: { file: File; type: DocType; notes?: string }) =>
            uploadDocument(requestId, file, type, notes),
        onSuccess: () => {
            toast.success('Documento subido correctamente')
            queryClient.invalidateQueries({ queryKey: ['maint-documents', requestId] })
            setOpenUpload(false)
            setPendingFile(null)
            setNotes('')
        },
        onError: () => toast.error('Error al subir documento'),
    })

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setPendingFile(file)
        setOpenUpload(true)
        e.target.value = ''
    }

    const handleUpload = () => {
        if (!pendingFile) return
        upload.mutate({ file: pendingFile, type: selectedType, notes: notes || undefined })
    }

    const handleDownload = (docId: string, fileName: string) => {
        apiClient.get(`/maintenance/documents/${docId}/download`, { responseType: 'blob' })
            .then(({ data, headers }) => {
                const url = window.URL.createObjectURL(new Blob([data]))
                const link = document.createElement('a')
                link.href = url
                link.download = fileName
                link.click()
                window.URL.revokeObjectURL(url)
            })
            .catch(() => toast.error('Error al descargar documento'))
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Documentos D1–D7
                </h3>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Subir
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : docs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No hay documentos adjuntos aún.
                </p>
            ) : (
                <ul className="space-y-2">
                    {docs.map((doc) => (
                        <li key={doc.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="secondary"
                                        className={`text-xs ${DOC_COLORS[doc.document_type] ?? ''}`}
                                    >
                                        {doc.document_type}
                                    </Badge>
                                    <span className="text-sm font-medium truncate">{doc.file_name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {formatBytes(doc.file_size)}
                                    {doc.uploaded_by_name && ` · ${doc.uploaded_by_name}`}
                                    {doc.uploaded_at && ` · ${new Date(doc.uploaded_at).toLocaleDateString('es-CL')}`}
                                </p>
                                {doc.notes && <p className="text-xs text-muted-foreground italic">{doc.notes}</p>}
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0"
                                onClick={() => handleDownload(doc.id, doc.file_name)}
                            >
                                <Download className="h-3.5 w-3.5" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            <Dialog open={openUpload} onOpenChange={setOpenUpload}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Clasificar documento</DialogTitle>
                    </DialogHeader>
                    {pendingFile && (
                        <p className="text-sm text-muted-foreground truncate">
                            Archivo: <strong>{pendingFile.name}</strong>
                        </p>
                    )}
                    <div className="space-y-3">
                        <div>
                            <Label>Tipo de documento *</Label>
                            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DocType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_TYPES.map((t) => (
                                        <SelectItem key={t} value={t}>{DOC_LABELS[t]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Notas (opcional)</Label>
                            <Textarea
                                placeholder="Descripción del documento..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setOpenUpload(false); setPendingFile(null) }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpload} disabled={upload.isPending}>
                            {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Subir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
