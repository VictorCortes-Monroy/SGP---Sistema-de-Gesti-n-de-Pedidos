import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as catalogApi from '../api/catalog'

// ── Suppliers ──

export const useSuppliers = (params?: any) =>
  useQuery({ queryKey: ['suppliers', params], queryFn: () => catalogApi.getSuppliers(params) })

export const useSupplier = (id: string) =>
  useQuery({ queryKey: ['supplier', id], queryFn: () => catalogApi.getSupplier(id), enabled: !!id })

export const useCreateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.createSupplier,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export const useUpdateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => catalogApi.updateSupplier(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['supplier', id] })
    },
  })
}

export const useDeactivateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.deactivateSupplier,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export const useSupplierSpendStats = () =>
  useQuery({ queryKey: ['supplier-spend'], queryFn: catalogApi.getSupplierSpendStats })

// ── Catalog Items ──

export const useCatalogItems = (params?: any) =>
  useQuery({ queryKey: ['catalog', params], queryFn: () => catalogApi.getCatalogItems(params) })

export const useCatalogItem = (id: string) =>
  useQuery({ queryKey: ['catalog-item', id], queryFn: () => catalogApi.getCatalogItem(id), enabled: !!id })

export const useCreateCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: catalogApi.createCatalogItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

export const useUpdateCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => catalogApi.updateCatalogItem(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['catalog'] })
      qc.invalidateQueries({ queryKey: ['catalog-item', id] })
    },
  })
}

export const useLinkSupplier = (itemId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => catalogApi.linkSupplierToCatalogItem(itemId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-item', itemId] }),
  })
}

export const useTopProducts = (limit = 10) =>
  useQuery({ queryKey: ['top-products', limit], queryFn: () => catalogApi.getTopProducts(limit) })
