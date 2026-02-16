import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  showComment?: boolean
  commentLabel?: string
  commentRequired?: boolean
  onConfirm: (comment?: string) => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  showComment = false,
  commentLabel = 'Comentario',
  commentRequired = false,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const [comment, setComment] = useState('')

  const handleConfirm = () => {
    onConfirm(showComment ? comment : undefined)
    setComment('')
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) setComment('')
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {showComment && (
          <div className="space-y-2">
            <Label htmlFor="confirm-comment">
              {commentLabel}
              {commentRequired && <span className="text-destructive"> *</span>}
            </Label>
            <Textarea
              id="confirm-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe un comentario..."
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading || (commentRequired && showComment && !comment.trim())}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
