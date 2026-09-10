import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Package, LayoutGrid } from 'lucide-react'
import { catalogApi } from '@/api/catalog'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { CategoryChip, CategoryRow } from '@/components/ui/CategoryNav'
import { ROLE_ICONS, ROLE_OPTIONS } from '@/lib/comboCategoryUi'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import type { CategoryResponse, ComboCategory, ProductDetailResponse, ProductInfo } from '@/types'

/** Fetches the full product record before showing the edit form — split this way
 * (wrapper fetches, inner form initializes its state straight from props) so the
 * form's useState never has to sync from a query after mount. */
function EditProductDialog({
  productId,
  categories,
  onClose,
  onSaved,
}: {
  productId: number
  categories: CategoryResponse[]
  onClose: () => void
  onSaved: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => catalogApi.getProduct(productId),
  })

  return (
    <Dialog open onClose={onClose} title="Editar producto">
      {isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ) : (
        <EditProductForm product={data} categories={categories} onSaved={onSaved} />
      )}
    </Dialog>
  )
}

function EditProductForm({
  product,
  categories,
  onSaved,
}: {
  product: ProductDetailResponse
  categories: CategoryResponse[]
  onSaved: () => void
}) {
  const [name, setName] = useState(product.name)
  const [categoryId, setCategoryId] = useState(String(product.categoryId))
  const [actsAs, setActsAs] = useState<ComboCategory | ''>(product.actsAsCategory ?? '')
  const [unitPrice, setUnitPrice] = useState(product.unitPrice != null ? String(product.unitPrice) : '')

  const update = useMutation({
    mutationFn: () =>
      catalogApi.updateProduct(product.id, {
        name,
        categoryId: Number(categoryId),
        actsAsCategory: actsAs || null,
        unitPrice: unitPrice ? Number(unitPrice) : null,
      }),
    onSuccess: () => {
      toast.success('Producto actualizado')
      onSaved()
    },
    onError: (e) => toast.error('No se pudo actualizar el producto', { description: getApiErrorMessage(e) }),
  })

  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (name && categoryId) update.mutate()
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Categoría
          </label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Rol de reemplazo (opcional)
          </label>
          <Select value={actsAs} onChange={(e) => setActsAs(e.target.value as ComboCategory | '')}>
            <option value="">Ninguno — usa la categoría tal cual</option>
            {ROLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-neutral-400 mt-1">
            Para casos como el huevo: aunque esté en Adicionales, puede "actuar como" Principio en el precio.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Precio unitario (referencia, no el de venta)
          </label>
          <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <p className="text-xs text-neutral-400 mt-1">
            Solo informativo/de inventario — lo que cobras de verdad se define en Precios, por categoría.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={!name || !categoryId} loading={update.isPending}>
          Guardar
        </Button>
      </form>

      <ProductBatchesSection productId={product.id} />
    </div>
  )
}

/** Historial de lotes de un producto — cada uno con su propia cantidad y
 * vencimiento, independiente de los demás. Al agregar uno nuevo, el anterior no se
 * pierde: queda abajo en la lista, y el que primero vence es el que se descuenta
 * primero cuando se pide (FIFO por vencimiento, en el backend). */
function ProductBatchesSection({ productId }: { productId: number }) {
  const queryClient = useQueryClient()
  const [newQuantity, setNewQuantity] = useState('')
  const [newExpiration, setNewExpiration] = useState('')

  const { data: batches, isLoading } = useQuery({
    queryKey: ['product-batches', productId],
    queryFn: () => catalogApi.getBatches(productId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['product-batches', productId] })
    queryClient.invalidateQueries({ queryKey: ['products-stock'] })
  }

  const addBatch = useMutation({
    mutationFn: () =>
      catalogApi.addBatch(productId, { quantity: Number(newQuantity), expirationDate: newExpiration || null }),
    onSuccess: () => {
      toast.success('Lote agregado')
      setNewQuantity('')
      setNewExpiration('')
      invalidate()
    },
    onError: (e) => toast.error('No se pudo agregar el lote', { description: getApiErrorMessage(e) }),
  })

  const deleteBatch = useMutation({
    mutationFn: (batchId: number) => catalogApi.deleteBatch(batchId),
    onSuccess: () => {
      toast.success('Lote eliminado')
      invalidate()
    },
    onError: (e) => toast.error('No se pudo eliminar el lote', { description: getApiErrorMessage(e) }),
  })

  const totalRemaining = (batches ?? []).reduce((sum, b) => sum + b.quantityRemaining, 0)

  return (
    <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Lotes</label>
        {!isLoading && <span className="text-xs font-medium text-neutral-500">Quedan {totalRemaining}</span>}
      </div>

      {isLoading ? (
        <div className="space-y-1.5 mb-2">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto mb-2">
          {batches?.length === 0 && <p className="text-xs text-neutral-400">Aún no hay lotes registrados.</p>}
          {batches?.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-neutral-900 dark:text-neutral-50">
                  {b.quantityRemaining} / {b.quantityReceived}
                  {b.quantityRemaining <= 0 && <span className="text-status-busy ml-1">(agotado)</span>}
                </p>
                <p className="text-xs text-neutral-400">
                  {b.expirationDate ? `Vence ${b.expirationDate.split('-').reverse().join('/')}` : 'Sin vencimiento'}
                  {' · '}
                  Recibido {b.receivedAt.split('-').reverse().join('/')}
                </p>
              </div>
              <button
                onClick={() => deleteBatch.mutate(b.id)}
                className="text-neutral-400 hover:text-red-500 flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          type="number"
          min={1}
          placeholder="Cantidad"
          value={newQuantity}
          onChange={(e) => setNewQuantity(e.target.value)}
          className="flex-1"
        />
        <Input
          type="date"
          value={newExpiration}
          onChange={(e) => setNewExpiration(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={() => addBatch.mutate()}
          disabled={!newQuantity || Number(newQuantity) <= 0}
          loading={addBatch.isPending}
        >
          <Plus size={14} />
        </Button>
      </div>
    </div>
  )
}

export default function CatalogoPage() {
  const queryClient = useQueryClient()
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const [catOpen, setCatOpen] = useState(false)
  const [catName, setCatName] = useState('')
  const [catRole, setCatRole] = useState<ComboCategory>('ACOMPANANTE')

  const [editingCat, setEditingCat] = useState<CategoryResponse | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatRole, setEditCatRole] = useState<ComboCategory>('ACOMPANANTE')

  const [deletingCat, setDeletingCat] = useState<CategoryResponse | null>(null)

  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductInfo | null>(null)

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: catalogApi.getCategories,
  })

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: catalogApi.getProducts,
  })

  const countByCategoryName = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products ?? []) {
      map.set(p.category.name, (map.get(p.category.name) ?? 0) + 1)
    }
    return map
  }, [products])

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId) ?? null

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (products ?? []).filter((p) => {
      const matchesCategory = !selectedCategory || p.category.name === selectedCategory.name
      const matchesSearch = !q || p.name.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, search])

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['products-with-details'] })
  }

  const createProduct = useMutation({
    mutationFn: () =>
      catalogApi.createProduct({
        name,
        categoryId: Number(categoryId),
      }),
    onSuccess: () => {
      toast.success('Producto creado')
      invalidateProducts()
      setOpen(false)
      setName('')
    },
    onError: (e) => toast.error('No se pudo crear el producto', { description: getApiErrorMessage(e) }),
  })

  const deleteProduct = useMutation({
    mutationFn: () => catalogApi.deleteProduct(deletingProduct!.id),
    onSuccess: () => {
      toast.success('Producto eliminado')
      invalidateProducts()
      setDeletingProduct(null)
    },
    onError: (e) => {
      toast.error('No se pudo eliminar el producto', { description: getApiErrorMessage(e) })
      setDeletingProduct(null)
    },
  })

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    invalidateProducts()
  }

  const createCategory = useMutation({
    mutationFn: () => catalogApi.createCategory({ name: catName, code: catRole }),
    onSuccess: () => {
      toast.success('Categoría creada')
      invalidateCategories()
      setCatOpen(false)
      setCatName('')
      setCatRole('ACOMPANANTE')
    },
    onError: (e) => toast.error('No se pudo crear la categoría', { description: getApiErrorMessage(e) }),
  })

  const editCategory = useMutation({
    mutationFn: () => catalogApi.updateCategory(editingCat!.id, { name: editCatName, code: editCatRole }),
    onSuccess: () => {
      toast.success('Categoría actualizada')
      invalidateCategories()
      setEditingCat(null)
    },
    onError: (e) => toast.error('No se pudo actualizar la categoría', { description: getApiErrorMessage(e) }),
  })

  const deleteCategory = useMutation({
    mutationFn: () => catalogApi.deleteCategory(deletingCat!.id),
    onSuccess: () => {
      toast.success('Categoría eliminada')
      if (deletingCat && selectedCategoryId === deletingCat.id) setSelectedCategoryId('all')
      invalidateCategories()
      setDeletingCat(null)
    },
    onError: (e) => {
      toast.error('No se pudo eliminar la categoría', { description: getApiErrorMessage(e) })
      setDeletingCat(null)
    },
  })

  const openEditCategory = (c: CategoryResponse) => {
    setEditingCat(c)
    setEditCatName(c.name)
    setEditCatRole(c.code)
  }

  const openNewProduct = () => {
    setCategoryId(selectedCategory ? String(selectedCategory.id) : '')
    setOpen(true)
  }

  const totalProducts = products?.length ?? 0

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <BackLink to="/admin" label="Volver a Admin" />
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-5">Catálogo</h1>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Categories: horizontal chips on mobile, a sidebar list on desktop */}
        <aside className="md:w-64 flex-shrink-0">
          <div className="flex md:hidden gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {loadingCategories ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />)
            ) : (
              <>
                <CategoryChip
                  icon={LayoutGrid}
                  label="Todos"
                  count={totalProducts}
                  active={selectedCategoryId === 'all'}
                  onClick={() => setSelectedCategoryId('all')}
                />
                {categories?.map((c) => (
                  <CategoryChip
                    key={c.id}
                    icon={ROLE_ICONS[c.code]}
                    label={c.name}
                    count={countByCategoryName.get(c.name) ?? 0}
                    active={selectedCategoryId === c.id}
                    onClick={() => setSelectedCategoryId(c.id)}
                  />
                ))}
                <CategoryChip icon={Plus} label="Categoría" count={0} active={false} onClick={() => setCatOpen(true)} />
              </>
            )}
          </div>

          <div className="hidden md:block space-y-1">
            {loadingCategories ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl" />)
            ) : (
              <>
                <CategoryRow
                  icon={LayoutGrid}
                  label="Todos"
                  count={totalProducts}
                  active={selectedCategoryId === 'all'}
                  onClick={() => setSelectedCategoryId('all')}
                />
                {categories?.map((c) => (
                  <CategoryRow
                    key={c.id}
                    icon={ROLE_ICONS[c.code]}
                    label={c.name}
                    count={countByCategoryName.get(c.name) ?? 0}
                    active={selectedCategoryId === c.id}
                    onClick={() => setSelectedCategoryId(c.id)}
                    onEdit={() => openEditCategory(c)}
                    onDelete={() => setDeletingCat(c)}
                  />
                ))}
                <Button variant="secondary" className="w-full mt-3" onClick={() => setCatOpen(true)}>
                  <Plus size={16} />
                  Nueva categoría
                </Button>
              </>
            )}
          </div>
        </aside>

        {/* Products */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openNewProduct}>
              <Plus size={16} />
              Producto
            </Button>
          </div>

          {loadingProducts ? (
            <Skeleton className="h-4 w-32 mb-2" />
          ) : (
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              {selectedCategory ? selectedCategory.name : 'Todos'} ({visibleProducts.length})
            </h2>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <button
              onClick={openNewProduct}
              className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-600 flex flex-col items-center justify-center gap-1.5 p-3 text-neutral-400 hover:border-brand-400 hover:text-brand-500 dark:hover:border-brand-500 dark:hover:text-brand-400 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                <Plus size={18} />
              </div>
              <span className="text-xs text-center leading-tight">
                Agregar producto{selectedCategory ? ` a ${selectedCategory.name}` : ''}
              </span>
            </button>

            {loadingProducts &&
              Array.from({ length: 7 }).map((_, i) => (
                <Card key={i} className="p-3 flex flex-col items-center gap-2">
                  <Skeleton className="w-11 h-11 rounded-full mt-2" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3.5 w-20" />
                </Card>
              ))}
            {!loadingProducts && visibleProducts.map((p) => {
              const cat = categories?.find((c) => c.name === p.category.name)
              const Icon = cat ? ROLE_ICONS[cat.code] : Package
              return (
                <Card key={p.id} className="relative p-3 flex flex-col items-center text-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors group">
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingProductId(p.id)}
                      title="Editar producto"
                      className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeletingProduct(p)}
                      title="Eliminar producto"
                      className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="w-11 h-11 rounded-full bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center mt-2">
                    <Icon size={19} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wide truncate">{p.category.name}</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">{p.name}</p>
                  </div>
                </Card>
              )
            })}
          </div>

          {!loadingProducts && visibleProducts.length === 0 && (
            <p className="text-center text-neutral-400 text-sm py-10">
              {search ? 'Ningún producto coincide con la búsqueda.' : 'Aún no hay productos en esta categoría.'}
            </p>
          )}
        </div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo producto">
        <div className="space-y-3">
          <Input placeholder="Nombre del producto" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Selecciona categoría</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button
            className="w-full"
            onClick={() => createProduct.mutate()}
            disabled={!name || !categoryId}
            loading={createProduct.isPending}
          >
            Guardar
          </Button>
        </div>
      </Dialog>

      {editingProductId && (
        <EditProductDialog
          productId={editingProductId}
          categories={categories ?? []}
          onClose={() => setEditingProductId(null)}
          onSaved={() => {
            invalidateProducts()
            setEditingProductId(null)
          }}
        />
      )}

      <Dialog open={!!deletingProduct} onClose={() => setDeletingProduct(null)} title="Eliminar producto">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
          ¿Eliminar <strong>{deletingProduct?.name}</strong>? Si ya se usó en un menú o un pedido, no se podrá
          eliminar — puedes editarlo en su lugar.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeletingProduct(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => deleteProduct.mutate()}
            loading={deleteProduct.isPending}
          >
            Eliminar
          </Button>
        </div>
      </Dialog>

      <Dialog open={catOpen} onClose={() => setCatOpen(false)} title="Nueva categoría">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (catName) createCategory.mutate()
          }}
        >
          <Input placeholder="Nombre de la categoría" value={catName} onChange={(e) => setCatName(e.target.value)} autoFocus />
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Rol de precio
            </label>
            <Select value={catRole} onChange={(e) => setCatRole(e.target.value as ComboCategory)}>
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-neutral-400 mt-1">
              Define cómo se cobra: puedes crear varias categorías con el mismo rol (ej. "Jugos" y "Gaseosas" como
              Bebida).
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={!catName} loading={createCategory.isPending}>
            Guardar
          </Button>
        </form>
      </Dialog>

      <Dialog open={!!editingCat} onClose={() => setEditingCat(null)} title="Editar categoría">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (editCatName) editCategory.mutate()
          }}
        >
          <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} autoFocus />
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Rol de precio
            </label>
            <Select value={editCatRole} onChange={(e) => setEditCatRole(e.target.value as ComboCategory)}>
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            {editingCat && editCatRole !== editingCat.code && (
              <p className="text-xs text-status-busy mt-1">
                Cambiar el rol afecta de inmediato cómo se cobran todos los productos de esta categoría.
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!editCatName} loading={editCategory.isPending}>
            Guardar
          </Button>
        </form>
      </Dialog>

      <Dialog open={!!deletingCat} onClose={() => setDeletingCat(null)} title="Eliminar categoría">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
          ¿Eliminar <strong>{deletingCat?.name}</strong>? Si todavía tiene productos asociados, no se podrá eliminar
          — muévelos a otra categoría o elimínalos primero.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeletingCat(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => deleteCategory.mutate()}
            loading={deleteCategory.isPending}
          >
            Eliminar
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
