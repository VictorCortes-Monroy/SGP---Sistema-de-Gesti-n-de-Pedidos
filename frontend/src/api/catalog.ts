import apiClient from './client'
import {
  Supplier, SupplierDetail, CatalogItem, CatalogItemDetail,
  SupplierProduct, TopProductEntry, SupplierSpendEntry,
} from './types'

// ── Suppliers ──

export const getSuppliers = async (params?: any): Promise<Supplier[]> => {
  const { data } = await apiClient.get('/suppliers/', { params })
  return data
}

export const getSupplier = async (id: string): Promise<SupplierDetail> => {
  const { data } = await apiClient.get(`/suppliers/${id}`)
  return data
}

export const createSupplier = async (payload: Partial<Supplier>): Promise<Supplier> => {
  const { data } = await apiClient.post('/suppliers/', payload)
  return data
}

export const updateSupplier = async (id: string, payload: Partial<Supplier>): Promise<Supplier> => {
  const { data } = await apiClient.put(`/suppliers/${id}`, payload)
  return data
}

export const deactivateSupplier = async (id: string): Promise<void> => {
  await apiClient.delete(`/suppliers/${id}`)
}

export const getSupplierSpendStats = async (): Promise<SupplierSpendEntry[]> => {
  const { data } = await apiClient.get('/suppliers/stats/spend')
  return data
}

// ── Catalog ──

export const getCatalogItems = async (params?: any): Promise<CatalogItem[]> => {
  const { data } = await apiClient.get('/catalog/', { params })
  return data
}

export const getCatalogItem = async (id: string): Promise<CatalogItemDetail> => {
  const { data } = await apiClient.get(`/catalog/${id}`)
  return data
}

export const createCatalogItem = async (payload: Partial<CatalogItem>): Promise<CatalogItem> => {
  const { data } = await apiClient.post('/catalog/', payload)
  return data
}

export const updateCatalogItem = async (id: string, payload: Partial<CatalogItem>): Promise<CatalogItem> => {
  const { data } = await apiClient.put(`/catalog/${id}`, payload)
  return data
}

export const getCatalogItemSuppliers = async (id: string): Promise<SupplierProduct[]> => {
  const { data } = await apiClient.get(`/catalog/${id}/suppliers`)
  return data
}

export const linkSupplierToCatalogItem = async (
  itemId: string,
  payload: { supplier_id: string; unit_price?: number; supplier_sku?: string; lead_time_days?: number; is_preferred?: boolean }
): Promise<SupplierProduct> => {
  const { data } = await apiClient.post(`/catalog/${itemId}/suppliers`, payload)
  return data
}

export const getTopProducts = async (limit = 10): Promise<TopProductEntry[]> => {
  const { data } = await apiClient.get('/catalog/stats/top-products', { params: { limit } })
  return data
}
