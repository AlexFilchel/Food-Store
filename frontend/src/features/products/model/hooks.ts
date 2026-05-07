import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { productClient } from '@/entities/products/api/product-client'
import type { ProductListFilters, ProductMutationPayload } from '@/entities/products/model/types'
import { productsQueryKeys } from '@/features/products/model/product-query-keys'

export const useProductsListQuery = (filters: ProductListFilters) => useQuery({ queryKey: productsQueryKeys.list(filters), queryFn: () => productClient.list(filters) })
export const useProductDetailQuery = (productId: number) => useQuery({ queryKey: productsQueryKeys.detail(productId), queryFn: () => productClient.detail(productId), enabled: productId > 0 })

export function useCreateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductMutationPayload) => productClient.create(payload),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() }) },
  })
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: number; payload: Partial<ProductMutationPayload> }) => productClient.update(productId, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: productsQueryKeys.detail(variables.productId) }),
      ])
    },
  })
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: productClient.remove,
    onSuccess: async (_, productId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() }),
        queryClient.removeQueries({ queryKey: productsQueryKeys.detail(productId) }),
      ])
    },
  })
}
