import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi } from '@/api/purchase-orders'
import { toast } from 'sonner'
import type { PurchaseOrderCreate, POReceptionInput, QuotationCreate } from '@/api/types'

export function usePurchaseOrdersForRequest(requestId: string) {
  return useQuery({
    queryKey: ['purchase-orders', { request_id: requestId }],
    queryFn: () => purchaseOrdersApi.list({ request_id: requestId }),
    enabled: !!requestId,
  })
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => purchaseOrdersApi.get(id),
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PurchaseOrderCreate) => purchaseOrdersApi.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', data.request_id] })
      qc.invalidateQueries({ queryKey: ['purchase-orders', { request_id: data.request_id }] })
      toast.success(`Orden de Compra ${data.oc_number} creada`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Error al crear OC')
    },
  })
}

export function useSendPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.send(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['purchase-order', data.id] })
      qc.invalidateQueries({ queryKey: ['purchase-orders', { request_id: data.request_id }] })
      toast.success('OC enviada al proveedor')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Error al enviar OC')
    },
  })
}

export function useReceivePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: POReceptionInput }) =>
      purchaseOrdersApi.receive(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['purchase-order', data.id] })
      qc.invalidateQueries({ queryKey: ['purchase-orders', { request_id: data.request_id }] })
      qc.invalidateQueries({ queryKey: ['request', data.request_id] })
      qc.invalidateQueries({ queryKey: ['requests'] })
      toast.success('Recepción registrada correctamente')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Error al registrar recepción')
    },
  })
}

export function useQuotationsForRequest(requestId: string) {
  return useQuery({
    queryKey: ['quotations', requestId],
    queryFn: () => purchaseOrdersApi.listQuotations(requestId),
    enabled: !!requestId,
  })
}

export function useCreateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: QuotationCreate) => purchaseOrdersApi.createQuotation(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['quotations', data.request_id] })
      toast.success('Cotización registrada')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Error al registrar cotización')
    },
  })
}
