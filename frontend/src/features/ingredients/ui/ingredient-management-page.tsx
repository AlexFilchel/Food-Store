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

  return (
    <section>
      <h2>Gestión de ingredientes</h2>
      <label>
        Buscar
        <input aria-label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <label>
        <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> Incluir inactivos
      </label>
      {error ? <p role="alert">{error}</p> : null}

      <form aria-label="Formulario de ingrediente" onSubmit={submitIngredient}>
        <h3>{editingIngredientId === null ? 'Nuevo ingrediente' : 'Editar ingrediente'}</h3>
        <label>Nombre<input aria-label="Nombre ingrediente" value={ingredientName} onChange={(e) => setIngredientName(e.target.value)} /></label>
        <label>Descripción<input aria-label="Descripción ingrediente" value={ingredientDescription} onChange={(e) => setIngredientDescription(e.target.value)} /></label>
        <label>
          <input type="checkbox" checked={ingredientActive} onChange={(e) => setIngredientActive(e.target.checked)} /> Ingrediente activo
        </label>
        <label>
          Alérgenos
          <select
            aria-label="Alérgenos"
            multiple
            value={selectedAllergens.map(String)}
            onChange={(e) => setSelectedAllergens(Array.from(e.currentTarget.selectedOptions, (o) => Number(o.value)))}
          >
            {(allergensQuery.data?.items ?? []).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <button type="submit">{editingIngredientId === null ? 'Crear ingrediente' : 'Guardar ingrediente'}</button>
        {editingIngredientId === null ? null : <button type="button" onClick={resetIngredientForm}>Cancelar edición ingrediente</button>}
      </form>

      <form aria-label="Formulario de alérgeno" onSubmit={submitAllergen}>
        <h3>{editingAllergenId === null ? 'Nuevo alérgeno' : 'Editar alérgeno'}</h3>
        <label>Nombre alérgeno<input aria-label="Nombre alérgeno" value={allergenName} onChange={(e) => setAllergenName(e.target.value)} /></label>
        <label>Descripción alérgeno<input aria-label="Descripción alérgeno" value={allergenDescription} onChange={(e) => setAllergenDescription(e.target.value)} /></label>
        <label>
          <input type="checkbox" checked={allergenActive} onChange={(e) => setAllergenActive(e.target.checked)} /> Alérgeno activo
        </label>
        <button type="submit">{editingAllergenId === null ? 'Crear alérgeno' : 'Guardar alérgeno'}</button>
        {editingAllergenId === null ? null : <button type="button" onClick={resetAllergenForm}>Cancelar edición alérgeno</button>}
      </form>

      {ingredientsQuery.isLoading ? <p>Cargando ingredientes...</p> : null}
      {(ingredientsQuery.data?.items ?? []).map((item) => (
        <article key={item.id}>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
          <div>{item.allergens.map((a) => <span key={a.id}>{a.name}</span>)}</div>
          <button type="button" onClick={() => startIngredientEdit(item)}>Editar ingrediente</button>
          <button type="button" onClick={() => void removeIngredient(item)}>Eliminar ingrediente</button>
        </article>
      ))}

      {allergensQuery.isLoading ? <p>Cargando alérgenos...</p> : null}
      {(allergensQuery.data?.items ?? []).map((item) => (
        <article key={item.id}>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
          <button type="button" onClick={() => startAllergenEdit(item)}>Editar alérgeno</button>
          <button type="button" onClick={() => void removeAllergen(item)}>Eliminar alérgeno</button>
        </article>
      ))}
    </section>
  )
}
