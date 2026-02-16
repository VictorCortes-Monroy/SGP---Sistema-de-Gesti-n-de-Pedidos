import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'

interface ItemRowProps {
  index: number
  item: { description: string; sku: string; quantity: number; unit_price: number }
  onChange: (index: number, field: string, value: any) => void
  onRemove: (index: number) => void
  canRemove: boolean
  errors?: Record<string, { message?: string }>
}

export function RequestItemRow({ index, item, onChange, onRemove, canRemove, errors }: ItemRowProps) {
  const subtotal = (item.quantity || 0) * (item.unit_price || 0)

  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-4">
        <Input
          placeholder="Descripcion del item"
          value={item.description}
          onChange={(e) => onChange(index, 'description', e.target.value)}
        />
        {errors?.description && (
          <p className="text-xs text-destructive mt-0.5">{errors.description.message}</p>
        )}
      </div>
      <div className="col-span-2">
        <Input
          placeholder="SKU (opcional)"
          value={item.sku}
          onChange={(e) => onChange(index, 'sku', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <Input
          type="number"
          placeholder="Cantidad"
          min={1}
          value={item.quantity || ''}
          onChange={(e) => onChange(index, 'quantity', Number(e.target.value))}
        />
        {errors?.quantity && (
          <p className="text-xs text-destructive mt-0.5">{errors.quantity.message}</p>
        )}
      </div>
      <div className="col-span-2">
        <Input
          type="number"
          placeholder="Precio unit."
          min={0}
          step={0.01}
          value={item.unit_price || ''}
          onChange={(e) => onChange(index, 'unit_price', Number(e.target.value))}
        />
        {errors?.unit_price && (
          <p className="text-xs text-destructive mt-0.5">{errors.unit_price.message}</p>
        )}
      </div>
      <div className="col-span-1 flex items-center justify-end pt-1.5">
        <span className="text-sm font-medium">{formatCurrency(subtotal)}</span>
      </div>
      <div className="col-span-1 flex items-center justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  )
}
