import { apiClient } from './client'
import type {
  CategoryRequest,
  CategoryResponse,
  ProductBatchRequest,
  ProductBatchResponse,
  ProductDetailResponse,
  ProductInfo,
  ProductRequest,
  ProductWithDetails,
  UpdateCategoryRequest,
  UpdateProductRequest,
} from '@/types'

export const catalogApi = {
  getCategories: () => apiClient.get<CategoryResponse[]>('/api/v1/categories').then((r) => r.data),

  createCategory: (data: CategoryRequest) =>
    apiClient.post<CategoryResponse>('/api/v1/categories', data).then((r) => r.data),

  updateCategory: (id: number, data: UpdateCategoryRequest) =>
    apiClient.patch<CategoryResponse>(`/api/v1/categories/${id}`, data).then((r) => r.data),

  deleteCategory: (id: number) => apiClient.delete(`/api/v1/categories/${id}`).then((r) => r.data),

  getProducts: () => apiClient.get<ProductInfo[]>('/api/v1/products').then((r) => r.data),

  getProductsWithDetails: () =>
    apiClient.get<ProductWithDetails[]>('/api/v1/products/details').then((r) => r.data),

  createProduct: (data: ProductRequest) => apiClient.post('/api/v1/products', data).then((r) => r.data),

  getProduct: (id: number) => apiClient.get<ProductDetailResponse>(`/api/v1/products/${id}`).then((r) => r.data),

  updateProduct: (id: number, data: UpdateProductRequest) =>
    apiClient.put<ProductDetailResponse>(`/api/v1/products/${id}`, data).then((r) => r.data),

  deleteProduct: (id: number) => apiClient.delete(`/api/v1/products/${id}`).then((r) => r.data),

  // Lotes — cantidad y vencimiento por lote recibido, con historial (a diferencia
  // del viejo campo único que se sobreescribía en cada edición).
  getStock: () => apiClient.get<Record<number, number>>('/api/v1/products/stock').then((r) => r.data),

  getBatches: (productId: number) =>
    apiClient.get<ProductBatchResponse[]>(`/api/v1/products/${productId}/batches`).then((r) => r.data),

  addBatch: (productId: number, data: ProductBatchRequest) =>
    apiClient.post<ProductBatchResponse>(`/api/v1/products/${productId}/batches`, data).then((r) => r.data),

  deleteBatch: (batchId: number) => apiClient.delete(`/api/v1/products/batches/${batchId}`).then((r) => r.data),
}
