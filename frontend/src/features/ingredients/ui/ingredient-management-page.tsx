import { type FormEvent, useState } from 'react'

import type { Allergen, Ingredient } from '@/entities/ingredients/model/types'
import {
  useAllergensListQuery,
  useCreateAllergenMutation,
  useCreateIngredientMutation,
  useDeleteAllergenMutation,
  useDeleteIngredientMutation,
  useIngredientsListQuery,
  useUpdateAllergenMutation,
  useUpdateIngredientMutation,
} from '@/features/ingredients/model/hooks'
import { getErrorMessage } from '@/shared/api/problem-details'

export function IngredientManagementPage() {
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [editingIngredientId, setEditingIngredientId] = useState<number | null>(null)
  const [ingredientName, setIngredientName] = useState('')
  const [ingredientDescription, setIngredientDescription] = useState('')
  const [ingredientActive, setIngredientActive] = useState(true)
  const [selectedAllergens, setSelectedAllergens] = useState<number[]>([])
  const [editingAllergenId, setEditingAllergenId] = useState<number | null>(null)
  const [allergenName, setAllergenName] = useState('')
  const [allergenDescription, setAllergenDescription] = useState('')
  const [allergenActive, setAllergenActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const ingredientsQuery = useIngredientsListQuery({ page: 1, size: 50, search, include_inactive: includeInactive })
  const allergensQuery = useAllergensListQuery({ page: 1, size: 50, include_inactive: includeInactive })
  const createIngredient = useCreateIngredientMutation()
  const updateIngredient = useUpdateIngredientMutation()
  const deleteIngredient = useDeleteIngredientMutation()
  const createAllergen = useCreateAllergenMutation()
  const updateAllergen = useUpdateAllergenMutation()
  const deleteAllergen = useDeleteAllergenMutation()

  function resetIngredientForm() {
    setEditingIngredientId(null)
    setIngredientName('')
    setIngredientDescription('')
    setIngredientActive(true)
    setSelectedAllergens([])
  }

  function resetAllergenForm() {
    setEditingAllergenId(null)
    setAllergenName('')
    setAllergenDescription('')
    setAllergenActive(true)
  }

  function startIngredientEdit(item: Ingredient) {
    setError(null)
    setEditingIngredientId(item.id)
    setIngredientName(item.name)
    setIngredientDescription(item.description ?? '')
    setIngredientActive(item.is_active)
    setSelectedAllergens(item.allergens.map((allergen) => allergen.id))
  }

  function startAllergenEdit(item: Allergen) {
    setError(null)
    setEditingAllergenId(item.id)
    setAllergenName(item.name)
    setAllergenDescription(item.description ?? '')
    setAllergenActive(item.is_active)
  }

  function toggleAllergen(allergenId: number) {
    setSelectedAllergens((prev) =>
      prev.includes(allergenId) ? prev.filter((id) => id !== allergenId) : [...prev, allergenId]
    )
  }

  async function submitIngredient(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = {
      name: ingredientName,
      description: ingredientDescription || null,
      is_active: ingredientActive,
      allergen_ids: selectedAllergens,
    }

    try {
      if (editingIngredientId === null) {
        await createIngredient.mutateAsync(payload)
      } else {
        await updateIngredient.mutateAsync({ ingredientId: editingIngredientId, payload })
      }
      resetIngredientForm()
    } catch (cause) {
      setError(getErrorMessage(cause))
    }
  }

  async function submitAllergen(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = {
      name: allergenName,
      description: allergenDescription || null,
      is_active: allergenActive,
    }

    try {
      if (editingAllergenId === null) {
        await createAllergen.mutateAsync(payload)
      } else {
        await updateAllergen.mutateAsync({ allergenId: editingAllergenId, payload })
      }
      resetAllergenForm()
    } catch (cause) {
      setError(getErrorMessage(cause))
    }
  }

  async function removeIngredient(item: Ingredient) {
    if (!window.confirm(`¿Eliminar ingrediente ${item.name}?`)) return
    try {
      await deleteIngredient.mutateAsync(item.id)
    } catch (cause) {
      setError(getErrorMessage(cause))
    }
  }

  async function removeAllergen(item: Allergen) {
    if (!window.confirm(`¿Eliminar alérgeno ${item.name}?`)) return
    try {
      await deleteAllergen.mutateAsync(item.id)
    } catch (cause) {
      setError(getErrorMessage(cause))
    }
  }

  const ingredientItems = ingredientsQuery.data?.items ?? []
  const allergenItems = allergensQuery.data?.items ?? []

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-slate-950">Gestión de ingredientes</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Administrá ingredientes y alérgenos del catálogo. Los ingredientes pueden tener múltiples alérgenos asociados.
          </p>
        </div>

        <div />
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <article className="rounded-lg border border-slate-200 p-5">
        <h3 className="text-xl font-semibold text-slate-950">Ingredientes</h3>
        <p className="mt-2 text-sm text-slate-600">Creá y editá ingredientes del catálogo.</p>

        <form className="mt-5 space-y-4" aria-label="Formulario de ingrediente" onSubmit={submitIngredient}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="ingredient-name">Nombre ingrediente</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="ingredient-name"
                value={ingredientName}
                onChange={(e) => setIngredientName(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="ingredient-description">Descripción</label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="ingredient-description"
                value={ingredientDescription}
                onChange={(e) => setIngredientDescription(e.target.value)}
              />
            </div>

            <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 md:col-span-2">
              <input
                checked={ingredientActive}
                className="size-4 rounded border-slate-300"
                onChange={(e) => setIngredientActive(e.target.checked)}
                type="checkbox"
              />
              Ingrediente activo
            </label>

            <div className="space-y-2 md:col-span-2">
              <span className="block text-sm font-medium text-slate-700">Alérgenos asociados</span>
              <div className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {allergenItems.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay alérgenos creados. Creá alérgenos en el bloque siguiente.</p>
                ) : (
                  allergenItems.map((allergen) => (
                    <label key={allergen.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedAllergens.includes(allergen.id)}
                        onChange={() => toggleAllergen(allergen.id)}
                        className="size-4 rounded border-slate-300"
                      />
                      {allergen.name}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <button className="inline-flex w-full items-center justify-center rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" type="submit">
            {editingIngredientId === null ? 'Crear ingrediente' : 'Guardar ingrediente'}
          </button>
          {editingIngredientId !== null && (
            <button className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" type="button" onClick={resetIngredientForm}>
              Cancelar edición
            </button>
          )}
        </form>
      </article>

      <article className="rounded-lg border border-slate-200 p-5">
        <h3 className="text-xl font-semibold text-slate-950">Alérgenos</h3>
        <p className="mt-2 text-sm text-slate-600">Creá y editá alérgenos para asociar a ingredientes.</p>

        <form className="mt-5 space-y-4" aria-label="Formulario de alérgeno" onSubmit={submitAllergen}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="allergen-name">Nombre alérgeno</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="allergen-name"
                value={allergenName}
                onChange={(e) => setAllergenName(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="allergen-description">Descripción</label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="allergen-description"
                value={allergenDescription}
                onChange={(e) => setAllergenDescription(e.target.value)}
              />
            </div>

            <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 md:col-span-2">
              <input
                checked={allergenActive}
                className="size-4 rounded border-slate-300"
                onChange={(e) => setAllergenActive(e.target.checked)}
                type="checkbox"
              />
              Alérgeno activo
            </label>
          </div>

          <button className="inline-flex w-full items-center justify-center rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" type="submit">
            {editingAllergenId === null ? 'Crear alérgeno' : 'Guardar alérgeno'}
          </button>
          {editingAllergenId !== null && (
            <button className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" type="button" onClick={resetAllergenForm}>
              Cancelar edición
            </button>
          )}
        </form>
      </article>

      <article className="space-y-6 rounded-lg border border-slate-200 p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-950">Ingredientes (administración)</h3>
            <label className="block">
              <span className="sr-only">Buscar ingrediente</span>
              <input
                className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                placeholder="Buscar ingrediente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <label className="inline-flex items-center gap-3 self-start rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
            <input
              checked={includeInactive}
              className="size-4 rounded border-slate-300"
              onChange={(e) => setIncludeInactive(e.target.checked)}
              type="checkbox"
            />
            Incluir inactivos
          </label>
        </div>

        {ingredientsQuery.isLoading ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Cargando ingredientes...</p> : null}
        {!ingredientsQuery.isLoading && ingredientItems.length === 0 ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">No hay ingredientes cargados.</p> : null}

        <div className="h-[430px] overflow-auto rounded-lg border border-slate-200">
          {!ingredientsQuery.isLoading && ingredientItems.length > 0 ? (
            <table className="min-w-[840px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 border-r border-slate-200/70">Nombre</th>
                  <th className="px-1 py-2 border-r border-slate-200/70 w-24">Estado</th>
                  <th className="px-4 py-3 border-r border-slate-200/70 w-56">Alérgenos</th>
                  <th className="px-1 py-2 w-52">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ingredientItems.map((item) => (
                  <tr className="border-t border-slate-200 align-top" key={item.id}>
                    <td className="px-4 py-3 border-r border-slate-200/60">
                      <p className="font-semibold text-slate-950">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.description || 'Sin descripción.'}</p>
                    </td>
                    <td
                      className={`px-1 py-2 border-r border-slate-200/60 align-middle font-medium text-slate-950 text-center ${
                        item.is_active ? 'bg-emerald-100/80' : 'bg-rose-200/80'
                      }`}
                    >
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200/60 align-middle text-center">
                      {item.allergens.length > 0 ? <p className="text-sm text-slate-950">{item.allergens.map((allergen) => allergen.name).join(' - ')}</p> : <span className="text-xs text-slate-500">Sin alérgenos</span>}
                    </td>
                    <td className="px-1 py-2 align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <button aria-label="Editar ingrediente" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50" type="button" onClick={() => startIngredientEdit(item)}>
                          Editar
                        </button>
                        <button aria-label="Eliminar ingrediente" className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50" type="button" onClick={() => void removeIngredient(item)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </article>

      <article className="space-y-6 rounded-lg border border-slate-200 p-5">
        <h3 className="text-xl font-semibold text-slate-950">Alérgenos (administración)</h3>

        {allergensQuery.isLoading ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Cargando alérgenos...</p> : null}
        {!allergensQuery.isLoading && allergenItems.length === 0 ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">No hay alérgenos cargados.</p> : null}

        {!allergensQuery.isLoading && allergenItems.length > 0 ? (
          <div className="h-[430px] overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-200/70 w-44">Nombre</th>
                  <th className="px-1 py-2 border-r border-slate-200/70 w-24">Estado</th>
                  <th className="px-1 py-2 w-52">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {allergenItems.map((item) => (
                  <tr className="border-t border-slate-200" key={item.id}>
                    <td className="px-3 py-2 border-r border-slate-200/60">
                      <p className="font-semibold text-slate-950">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.description || 'Sin descripción.'}</p>
                    </td>
                    <td
                      className={`px-1 py-2 border-r border-slate-200/60 font-medium text-slate-950 text-center ${
                        item.is_active ? 'bg-emerald-100/80' : 'bg-rose-200/80'
                      }`}
                    >
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </td>
                    <td className="px-1 py-2 align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <button aria-label="Editar alérgeno" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50" type="button" onClick={() => startAllergenEdit(item)}>
                          Editar
                        </button>
                        <button aria-label="Eliminar alérgeno" className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50" type="button" onClick={() => void removeAllergen(item)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  )
}
