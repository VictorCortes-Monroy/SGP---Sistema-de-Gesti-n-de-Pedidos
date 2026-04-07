import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestsApi } from '@/api/requests'
import type { RequestFilters, RequestCreate, WorkflowAction, ReceptionInput } from '@/api/types'
import { toast } from 'sonner'

export function useRequests(filters: RequestFilters = {}) {
  return useQuery({
    queryKey: ['requests', filters],
    queryFn: () => requestsApi.list(filters),
    placeholderData: (prev) => prev,
  })
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ['request', id],
    queryFn: () => requestsApi.getDetail(id),
    enabled: !!id,
  })
}

export function useRequestTimeline(id: string) {
  return useQuery({
    queryKey: ['request', id, 'timeline'],
    queryFn: () => requestsApi.getTimeline(id),
    enabled: !!id,
  })
}

export function useCreateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RequestCreate) => requestsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      toast.success('Solicitud creada exitosamente')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Error al crear solicitud')
    },
  })
}

export function useSubmitRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => requestsApi.submit(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', id] })
      toast.success('Solicitud enviada a aprobacion')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Error al enviar solicitud')
    },
  })
}

export function useApproveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      requestsApi.approve(id, { comment }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', id] })
      toast.success('Solicitud aprobada')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Error al aprobar')
    },
  })
}

export function useRejectRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      requestsApi.reject(id, { comment }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', id] })
      toast.success('Solicitud rechazada')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Error al rechazar')
    },
  })
}

export function useCancelRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      requestsApi.cancel(id, { comment }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', id] })
      toast.success('Solicitud cancelada')
    },
  })
}

export function usePurchaseRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => requestsApi.purchase(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', id] })
      toast.success('Solicitud marcada como En Compra')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Error al iniciar compra')
    },
  })
}

export function useReceiveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReceptionInput }) =>
      requestsApi.receive(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request', id] })
      toast.success('Recepcion registrada')
    },
  })
}

export function useRequestDocuments(id: string) {
  return useQuery({
    queryKey: ['request', id, 'documents'],
    queryFn: () => requestsApi.getDocuments(id),
    enabled: !!id,
  })
}

export function useUploadRequestDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file, notes }: { id: string; file: File; notes?: string }) =>
      requestsApi.uploadDocument(id, file, notes),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['request', id, 'documents'] })
      qc.invalidateQueries({ queryKey: ['request', id] })
      toast.success('Documento adjuntado')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Error al subir documento')
    },
  })
}
