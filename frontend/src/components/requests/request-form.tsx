import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Save, Send, Loader2, Paperclip, X, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { RequestItemRow } from './request-item-row'
import { useCreateRequest, useSubmitRequest, useUploadRequestDocument } from '@/hooks/use-requests'
import { useCompanies, useCostCenters } from '@/hooks/use-organizations'
import { formatCurrency } from '@/lib/format'
import type { PurchaseType } from '@/api/types'

const itemSchema = z.object({
  description: z.string().min(1, 'Descripcion requerida'),
  sku: z.string().optional().default(''),
  quantity: z.number().min(1, 'Minimo 1'),
  unit_price: z.number().min(0.01, 'Precio invalido'),
})

const requestSchema = z.object({
  title: z.string().min(1, 'Titulo requerido'),
  description: z.string().optional().default(''),
  cost_center_id: z.string().min(1, 'Centro de costo requerido'),
  purchase_type: z.enum(['INSUMOS', 'ACTIVOS_FIJOS', 'OTROS_SERVICIOS']).default('INSUMOS'),
  items: z.array(itemSchema).min(1, 'Agrega al menos un item'),
})

type RequestFormData = z.infer<typeof requestSchema>

const emptyItem = { description: '', sku: '', quantity: 1, unit_price: 0 }

const PURCHASE_TYPES: { value: PurchaseType; label: string; description: string }[] = [
  { value: 'INSUMOS', label: 'Insumos / Materiales', description: 'Consumibles, repuestos, materiales de operación' },
  { value: 'ACTIVOS_FIJOS', label: 'Activos Fijos', description: 'Maquinaria, equipos, mobiliario, infraestructura' },
  { value: 'OTROS_SERVICIOS', label: 'Otros Servicios', description: 'Servicios externos, consultorías, arriendos' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function RequestForm() {
  const navigate = useNavigate()
  const createRequest = useCreateRequest()
  const submitRequest = useSubmitRequest()
  const uploadDocument = useUploadRequestDocument()

  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: companiesData } = useCompanies()
  const companies = companiesData?.items ?? []

  const { data: costCentersData } = useCostCenters(selectedCompanyId || undefined)
  const costCenters = (costCentersData as any)?.items ?? costCentersData ?? []

  const [items, setItems] = useState([{ ...emptyItem }])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: '',
      description: '',
      cost_center_id: '',
      purchase_type: 'INSUMOS',
      items: [{ ...emptyItem }],
    },
  })

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    ;(updated[index] as any)[field] = value
    setItems(updated)
    setValue('items', updated as any, { shouldValidate: true })
  }

  const addItem = () => {
    const updated = [...items, { ...emptyItem }]
    setItems(updated)
    setValue('items', updated as any)
  }

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
    setValue('items', updated as any, { shouldValidate: true })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPendingFiles((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0)

  const onSubmit = async (data: RequestFormData, submitAfter: boolean) => {
    try {
      const result = await createRequest.mutateAsync({
        title: data.title,
        description: data.description,
        cost_center_id: data.cost_center_id,
        purchase_type: data.purchase_type,
        items: data.items.map((item) => ({
          description: item.description,
          sku: item.sku || undefined,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      })

      // Upload pending files sequentially
      if (result?.id && pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          await uploadDocument.mutateAsync({ id: result.id, file })
        }
      }

      if (submitAfter && result?.id) {
        await submitRequest.mutateAsync(result.id)
        navigate('/solicitudes')
      } else if (result?.id) {
        navigate(`/solicitudes/${result.id}`)
      }
    } catch {
      // Errors handled by mutation hooks
    }
  }

  const isLoading = createRequest.isPending || submitRequest.isPending || uploadDocument.isPending

  return (
    <form className="space-y-6">
      {/* 1. ORGANIZACIÓN */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Organización</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Empresa *</Label>
            <Select
              value={selectedCompanyId}
              onValueChange={(v) => {
                setSelectedCompanyId(v)
                setValue('cost_center_id', '', { shouldValidate: false })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Centro de Costo *</Label>
            <Select
              value={watch('cost_center_id')}
              onValueChange={(v) => setValue('cost_center_id', v, { shouldValidate: true })}
              disabled={!selectedCompanyId}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedCompanyId ? 'Selecciona un CC' : 'Selecciona empresa primero'} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(costCenters) &&
                  costCenters.map((cc: any) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.cost_center_id && (
              <p className="text-xs text-destructive">{errors.cost_center_id.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. DETALLE DE LA SOLICITUD */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalle de la Solicitud</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" placeholder="Ej: Compra de repuestos para excavadora CAT 336" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Tipo de Compra *</Label>
            <Select
              value={watch('purchase_type')}
              onValueChange={(v) => setValue('purchase_type', v as PurchaseType, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    <div>
                      <div className="font-medium">{pt.label}</div>
                      <div className="text-xs text-muted-foreground">{pt.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Descripción detallada de la necesidad o justificación (opcional)"
              rows={3}
              {...register('description')}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. ÍTEMS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Ítems</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar Ítem
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">Descripcion</div>
            <div className="col-span-2">SKU</div>
            <div className="col-span-2">Cantidad</div>
            <div className="col-span-2">Precio Unit.</div>
            <div className="col-span-1 text-right">Subtotal</div>
            <div className="col-span-1" />
          </div>

          {items.map((item, idx) => (
            <RequestItemRow
              key={idx}
              index={idx}
              item={item}
              onChange={updateItem}
              onRemove={removeItem}
              canRemove={items.length > 1}
              errors={(errors.items as any)?.[idx]}
            />
          ))}

          {errors.items && typeof errors.items.message === 'string' && (
            <p className="text-xs text-destructive">{errors.items.message}</p>
          )}

          <Separator />

          <div className="flex justify-end">
            <span className="text-lg font-bold">Total: {formatCurrency(total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. DOCUMENTOS ADJUNTOS */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Documentos Adjuntos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Adjunta cotizaciones, especificaciones técnicas u otros documentos relevantes.
            Formatos permitidos: PDF, Word, Excel. Máximo 10 MB por archivo.
          </p>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Adjuntar Archivo
            </Button>
          </div>

          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              {pendingFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{file.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {formatFileSize(file.size)}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeFile(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={handleSubmit((data) => onSubmit(data, false))}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Guardar Borrador
        </Button>
        <Button
          type="button"
          disabled={isLoading}
          onClick={handleSubmit((data) => onSubmit(data, true))}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Send className="mr-2 h-4 w-4" />
          Guardar y Enviar
        </Button>
      </div>
    </form>
  )
}
