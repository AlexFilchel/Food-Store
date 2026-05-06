import { useEffect, useMemo, useState } from 'react'

import type { Category, CategoryMutationPayload, CategoryTreeNode } from '@/entities/categories/model/types'
import { useCreateCategoryMutation } from '@/features/categories/model/use-create-category-mutation'
import { useCategoriesListQuery } from '@/features/categories/model/use-categories-list-query'
import { useCategoriesTreeQuery } from '@/features/categories/model/use-categories-tree-query'
import { useDeleteCategoryMutation } from '@/features/categories/model/use-delete-category-mutation'
import { useUpdateCategoryMutation } from '@/features/categories/model/use-update-category-mutation'
import { getErrorMessage, getFieldErrors } from '@/shared/api/problem-details'

interface CategoryFormState {
  name: string
  description: string
  parentId: string
  sortOrder: string
  isActive: boolean
}

interface ParentOption {
  id: number
  label: string
}

const DEFAULT_LIST_FILTERS = {
  page: 1,
  size: 50,
} as const

export function CategoryManagementPage() {
  const [includeInactive, setIncludeInactive] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const listQuery = useCategoriesListQuery({
    ...DEFAULT_LIST_FILTERS,
    include_inactive: includeInactive,
  })
  const treeQuery = useCategoriesTreeQuery(includeInactive)
  const deleteMutation = useDeleteCategoryMutation()

  const categories = listQuery.data?.items ?? []
  const tree = treeQuery.data ?? []
  const parentOptions = useMemo(() => buildParentOptions(tree), [tree])

  async function handleDelete(category: Category) {
    setDeleteError(null)

    if (!window.confirm(`¿Seguro que querés eliminar la categoría "${category.name}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(category.id)
      if (editingCategory?.id === category.id) {
        setEditingCategory(null)
      }
    } catch (error) {
      setDeleteError(getErrorMessage(error, 'No pudimos eliminar la categoría.'))
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-900">ADMIN · Categorías</span>
          <h2 className="mt-4 text-3xl font-semibold text-slate-950">Gestión de categorías</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Administrá la taxonomía del catálogo con validaciones de jerarquía, soft delete y consistencia entre lista y árbol.
          </p>
        </div>

        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
          <input
            checked={includeInactive}
            className="size-4 rounded border-slate-300"
            onChange={(event) => setIncludeInactive(event.target.checked)}
            type="checkbox"
          />
          Mostrar categorías inactivas
        </label>
      </div>

      {deleteError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {deleteError}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,420px)]">
        <div className="space-y-6">
          <CategorySummaryCard total={listQuery.data?.total ?? 0} treeRoots={tree.length} />

          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryListPanel
              categories={categories}
              errorMessage={listQuery.isError ? getErrorMessage(listQuery.error, 'No pudimos cargar la lista de categorías.') : null}
              isDeleting={deleteMutation.isPending}
              isLoading={listQuery.isLoading}
              onDelete={handleDelete}
              onEdit={setEditingCategory}
            />
            <CategoryTreePanel
              errorMessage={treeQuery.isError ? getErrorMessage(treeQuery.error, 'No pudimos cargar el árbol de categorías.') : null}
              isLoading={treeQuery.isLoading}
              tree={tree}
            />
          </div>
        </div>

        <CategoryFormCard
          category={editingCategory}
          parentOptions={parentOptions}
          tree={tree}
          onCancelEdit={() => setEditingCategory(null)}
          onSaved={() => setEditingCategory(null)}
        />
      </div>
    </section>
  )
}

function CategorySummaryCard({ total, treeRoots }: { total: number; treeRoots: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-medium text-slate-500">Categorías visibles</p>
        <p className="mt-3 text-3xl font-semibold text-slate-950">{total}</p>
      </article>
      <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-medium text-slate-500">Raíces del árbol</p>
        <p className="mt-3 text-3xl font-semibold text-slate-950">{treeRoots}</p>
      </article>
    </div>
  )
}

interface CategoryListPanelProps {
  categories: Category[]
  errorMessage: string | null
  isDeleting: boolean
  isLoading: boolean
  onDelete: (category: Category) => Promise<void>
  onEdit: (category: Category) => void
}

function CategoryListPanel({ categories, errorMessage, isDeleting, isLoading, onDelete, onEdit }: CategoryListPanelProps) {
  return (
    <article className="rounded-3xl border border-slate-200 p-5">
      <h3 className="text-xl font-semibold text-slate-950">Lista administrativa</h3>
      <p className="mt-2 text-sm text-slate-600">Vista plana para revisar estado, parent y acciones rápidas.</p>

      {isLoading ? <PanelMessage message="Cargando categorías..." /> : null}
      {errorMessage ? <PanelError message={errorMessage} /> : null}
      {!isLoading && !errorMessage && categories.length === 0 ? <PanelMessage message="Todavía no hay categorías cargadas." /> : null}

      {!isLoading && !errorMessage && categories.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {categories.map((category) => (
            <li className="rounded-2xl border border-slate-200 p-4" key={category.id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-slate-950">{category.name}</h4>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{category.slug}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        category.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {category.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{category.description || 'Sin descripción.'}</p>
                  <dl className="grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                    <div>
                      <dt className="font-medium text-slate-700">Parent</dt>
                      <dd>{category.parent_id ?? 'Raíz'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-700">Orden</dt>
                      <dd>{category.sort_order}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-700">Actualizada</dt>
                      <dd>{new Date(category.updated_at).toLocaleString('es-AR')}</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    onClick={() => onEdit(category)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isDeleting}
                    onClick={() => void onDelete(category)}
                    type="button"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function CategoryTreePanel({ errorMessage, isLoading, tree }: { errorMessage: string | null; isLoading: boolean; tree: CategoryTreeNode[] }) {
  return (
    <article className="rounded-3xl border border-slate-200 p-5">
      <h3 className="text-xl font-semibold text-slate-950">Árbol jerárquico</h3>
      <p className="mt-2 text-sm text-slate-600">La UI carga la estructura completa para evitar validaciones ciegas y mostrar dependencias activas.</p>

      {isLoading ? <PanelMessage message="Cargando árbol de categorías..." /> : null}
      {errorMessage ? <PanelError message={errorMessage} /> : null}
      {!isLoading && !errorMessage && tree.length === 0 ? <PanelMessage message="No hay nodos para mostrar en el árbol." /> : null}

      {!isLoading && !errorMessage && tree.length > 0 ? (
        <ul className="mt-5 space-y-3" aria-label="Árbol de categorías">
          {tree.map((node) => (
            <CategoryTreeBranch key={node.id} node={node} />
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function CategoryTreeBranch({ node }: { node: CategoryTreeNode }) {
  const children = node.children ?? []

  return (
    <li>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-950">{node.name}</span>
          <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{node.slug}</span>
          {!node.is_active ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">Inactiva</span> : null}
        </div>
      </div>

      {children.length > 0 ? (
        <ul className="ml-5 mt-3 space-y-3 border-l border-slate-200 pl-4">
          {children.map((child) => (
            <CategoryTreeBranch key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

interface CategoryFormCardProps {
  category: Category | null
  parentOptions: ParentOption[]
  tree: CategoryTreeNode[]
  onCancelEdit: () => void
  onSaved: () => void
}

function CategoryFormCard({ category, onCancelEdit, onSaved, parentOptions, tree }: CategoryFormCardProps) {
  const createMutation = useCreateCategoryMutation()
  const updateMutation = useUpdateCategoryMutation()
  const [form, setForm] = useState<CategoryFormState>(buildInitialFormState(category))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const blockedParentIds = useMemo(() => new Set(category ? collectDescendantIds(tree, category.id) : []), [category, tree])
  const filteredParentOptions = useMemo(
    () => parentOptions.filter((option) => !blockedParentIds.has(option.id)),
    [blockedParentIds, parentOptions],
  )

  useEffect(() => {
    setForm(buildInitialFormState(category))
    setFieldErrors({})
    setFormError(null)
  }, [category])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)

    const payload: CategoryMutationPayload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      parent_id: form.parentId ? Number(form.parentId) : null,
      sort_order: Number(form.sortOrder) || 0,
      is_active: form.isActive,
    }

    try {
      if (category) {
        await updateMutation.mutateAsync({ categoryId: category.id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onSaved()
      setForm(buildInitialFormState(null))
    } catch (error) {
      setFieldErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error, 'No pudimos guardar la categoría.'))
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <article className="rounded-3xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">{category ? 'Editar categoría' : 'Crear categoría'}</h3>
          <p className="mt-2 text-sm text-slate-600">
            El backend sigue siendo la fuente de verdad para parent inválido, ciclos, duplicados y restricciones de borrado.
          </p>
        </div>

        {category ? (
          <button
            className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={onCancelEdit}
            type="button"
          >
            Cancelar
          </button>
        ) : null}
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <TextField
          error={fieldErrors.name}
          id="category-name"
          label="Nombre"
          onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          value={form.name}
        />

        <TextAreaField
          error={fieldErrors.description}
          id="category-description"
          label="Descripción"
          onChange={(value) => setForm((current) => ({ ...current, description: value }))}
          value={form.description}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            error={fieldErrors.parent_id}
            id="category-parent"
            label="Categoría padre"
            onChange={(value) => setForm((current) => ({ ...current, parentId: value }))}
            options={filteredParentOptions}
            value={form.parentId}
          />
          <TextField
            error={fieldErrors.sort_order}
            id="category-sort-order"
            label="Orden"
            onChange={(value) => setForm((current) => ({ ...current, sortOrder: value }))}
            type="number"
            value={form.sortOrder}
          />
        </div>

        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
          <input
            checked={form.isActive}
            className="size-4 rounded border-slate-300"
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            type="checkbox"
          />
          Categoría activa
        </label>

        {formError ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'Guardando...' : category ? 'Guardar cambios' : 'Crear categoría'}
        </button>
      </form>
    </article>
  )
}

function PanelMessage({ message }: { message: string }) {
  return <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</p>
}

function PanelError({ message }: { message: string }) {
  return (
    <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      {message}
    </p>
  )
}

function TextField({
  error,
  id,
  label,
  onChange,
  type = 'text',
  value,
}: {
  error?: string
  id: string
  label: string
  onChange: (value: string) => void
  type?: 'number' | 'text'
  value: string
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error ? (
        <p className="text-sm text-rose-600" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function TextAreaField({
  error,
  id,
  label,
  onChange,
  value,
}: {
  error?: string
  id: string
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <textarea
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      {error ? (
        <p className="text-sm text-rose-600" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function SelectField({
  error,
  id,
  label,
  onChange,
  options,
  value,
}: {
  error?: string
  id: string
  label: string
  onChange: (value: string) => void
  options: ParentOption[]
  value: string
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Sin padre (raíz)</option>
        {options.map((option) => (
          <option key={option.id} value={String(option.id)}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-sm text-rose-600" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function buildInitialFormState(category: Category | null): CategoryFormState {
  if (!category) {
    return {
      name: '',
      description: '',
      parentId: '',
      sortOrder: '0',
      isActive: true,
    }
  }

  return {
    name: category.name,
    description: category.description ?? '',
    parentId: category.parent_id ? String(category.parent_id) : '',
    sortOrder: String(category.sort_order),
    isActive: category.is_active,
  }
}

function buildParentOptions(tree: CategoryTreeNode[]) {
  const options: ParentOption[] = []

  function visit(node: CategoryTreeNode, depth: number) {
    const children = node.children ?? []
    options.push({
      id: node.id,
      label: `${'— '.repeat(depth)}${node.name}`,
    })
    children.forEach((child) => visit(child, depth + 1))
  }

  tree.forEach((node) => visit(node, 0))
  return options
}

function collectDescendantIds(tree: CategoryTreeNode[], targetId: number) {
  const descendants: number[] = [targetId]

  function walk(node: CategoryTreeNode): boolean {
    const children = node.children ?? []
    if (node.id === targetId) {
      collect(node)
      return true
    }

    return children.some((child) => walk(child))
  }

  function collect(node: CategoryTreeNode) {
    const children = node.children ?? []
    children.forEach((child) => {
      descendants.push(child.id)
      collect(child)
    })
  }

  tree.some((node) => walk(node))
  return descendants
}
