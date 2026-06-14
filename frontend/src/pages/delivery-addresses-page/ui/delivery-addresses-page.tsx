import { useState } from 'react'

import {
  useCreateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
  useDeliveryAddressListQuery,
  useSetDefaultDeliveryAddressMutation,
  useUpdateDeliveryAddressMutation,
} from '@/features/delivery-addresses/model/hooks'
import type { DeliveryAddress, DeliveryAddressCreateRequest } from '@/entities/delivery-addresses/model/types'
import { getProblemDetails } from '@/shared/api/problem-details'

interface AddressFormValues {
  recipient_name: string
  phone: string
  street: string
  street_number: string
  floor: string
  apartment: string
  city: string
  province: string
  postal_code: string
  reference: string
  is_default: boolean
}

const EMPTY_FORM: AddressFormValues = {
  recipient_name: '',
  phone: '',
  street: '',
  street_number: '',
  floor: '',
  apartment: '',
  city: '',
  province: '',
  postal_code: '',
  reference: '',
  is_default: false,
}

function addressToForm(address: DeliveryAddress): AddressFormValues {
  return {
    recipient_name: address.recipient_name,
    phone: address.phone,
    street: address.street,
    street_number: address.street_number,
    floor: address.floor ?? '',
    apartment: address.apartment ?? '',
    city: address.city,
    province: address.province,
    postal_code: address.postal_code,
    reference: address.reference ?? '',
    is_default: address.is_default,
  }
}

function formToPayload(values: AddressFormValues): DeliveryAddressCreateRequest {
  return {
    recipient_name: values.recipient_name.trim(),
    phone: values.phone.trim(),
    street: values.street.trim(),
    street_number: values.street_number.trim(),
    floor: values.floor.trim() || null,
    apartment: values.apartment.trim() || null,
    city: values.city.trim(),
    province: values.province.trim(),
    postal_code: values.postal_code.trim(),
    reference: values.reference.trim() || null,
    is_default: values.is_default,
  }
}

export function DeliveryAddressesPage() {
  const listQuery = useDeliveryAddressListQuery()
  const createMutation = useCreateDeliveryAddressMutation()
  const updateMutation = useUpdateDeliveryAddressMutation()
  const deleteMutation = useDeleteDeliveryAddressMutation()
  const setDefaultMutation = useSetDefaultDeliveryAddressMutation()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formValues, setFormValues] = useState<AddressFormValues>(EMPTY_FORM)
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const addresses = listQuery.data ?? []

  function openCreateForm() {
    setFormValues(EMPTY_FORM)
    setFormFeedback(null)
    setEditingId(null)
    setShowCreateForm(true)
  }

  function openEditForm(address: DeliveryAddress) {
    setFormValues(addressToForm(address))
    setFormFeedback(null)
    setEditingId(address.id)
    setShowCreateForm(false)
  }

  function closeForm() {
    setShowCreateForm(false)
    setEditingId(null)
    setFormFeedback(null)
  }

  function updateField<K extends keyof AddressFormValues>(field: K, value: AddressFormValues[K]) {
    setFormFeedback(null)
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormFeedback(null)

    try {
      if (editingId !== null) {
        await updateMutation.mutateAsync({ addressId: editingId, payload: formToPayload(formValues) })
        setFormFeedback({ type: 'success', message: 'Dirección actualizada correctamente.' })
      } else {
        await createMutation.mutateAsync(formToPayload(formValues))
        setFormFeedback({ type: 'success', message: 'Dirección creada correctamente.' })
        setFormValues(EMPTY_FORM)
      }
    } catch (error) {
      const problem = getProblemDetails(error)
      setFormFeedback({ type: 'error', message: problem?.detail ?? 'No pudimos guardar la dirección. Revisá los datos e intentá de nuevo.' })
    }
  }

  async function handleDelete(addressId: number) {
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(addressId)
      setDeleteConfirmId(null)
      if (editingId === addressId) {
        closeForm()
      }
    } catch (error) {
      const problem = getProblemDetails(error)
      setActionError(problem?.detail ?? 'No pudimos eliminar la dirección.')
      setDeleteConfirmId(null)
    }
  }

  async function handleSetDefault(addressId: number) {
    setActionError(null)
    try {
      await setDefaultMutation.mutateAsync(addressId)
    } catch (error) {
      const problem = getProblemDetails(error)
      setActionError(problem?.detail ?? 'No pudimos establecer la dirección como predeterminada.')
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <header className="space-y-1">
            <h2 className="text-3xl font-semibold text-slate-950">Mis direcciones</h2>
            <p className="text-sm text-slate-600">Gestioná las direcciones de entrega para tus pedidos.</p>
          </header>
          <button
            className="inline-flex self-start rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 sm:self-auto"
            onClick={openCreateForm}
            type="button"
          >
            + Agregar dirección
          </button>
        </div>
      </div>

      {actionError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {actionError}
        </p>
      ) : null}

      {listQuery.isLoading ? (
        <p className="text-slate-600">Cargando direcciones...</p>
      ) : listQuery.isError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          No pudimos cargar tus direcciones. Intentá de nuevo en un momento.
        </p>
      ) : addresses.length === 0 && !showCreateForm ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-slate-600">Todavía no tenés direcciones guardadas.</p>
          <button
            className="mt-4 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            onClick={openCreateForm}
            type="button"
          >
            Agregar tu primera dirección
          </button>
        </div>
      ) : null}

      {addresses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <article
              key={address.id}
              className={`rounded-xl border p-4 shadow-sm ${address.is_default ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-950">{address.recipient_name}</p>
                  <p className="text-sm text-slate-600">{address.phone}</p>
                </div>
                {address.is_default ? (
                  <span className="rounded-full bg-sky-600 px-2 py-1 text-xs font-semibold text-white">Predeterminada</span>
                ) : null}
              </div>

              <p className="text-sm text-slate-700">
                {address.street} {address.street_number}
                {address.floor ? `, Piso ${address.floor}` : ''}
                {address.apartment ? ` Depto. ${address.apartment}` : ''}
              </p>
              <p className="text-sm text-slate-700">{address.city}, {address.province} ({address.postal_code})</p>
              {address.reference ? <p className="mt-1 text-xs text-slate-500">Referencia: {address.reference}</p> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => openEditForm(address)}
                  type="button"
                >
                  Editar
                </button>
                {!address.is_default ? (
                  <button
                    className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60"
                    disabled={setDefaultMutation.isPending}
                    onClick={() => void handleSetDefault(address.id)}
                    type="button"
                  >
                    Establecer como predeterminada
                  </button>
                ) : null}
                {deleteConfirmId === address.id ? (
                  <span className="flex items-center gap-2 text-xs text-slate-700">
                    ¿Seguro?
                    <button
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                      disabled={deleteMutation.isPending}
                      onClick={() => void handleDelete(address.id)}
                      type="button"
                    >
                      Sí, eliminar
                    </button>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setDeleteConfirmId(null)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    onClick={() => setDeleteConfirmId(address.id)}
                    type="button"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {(showCreateForm || editingId !== null) ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-950">
              {editingId !== null ? 'Editar dirección' : 'Nueva dirección'}
            </h3>
            <button
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={closeForm}
              type="button"
            >
              Cancelar
            </button>
          </div>

          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900" htmlFor="recipient-name">Nombre del destinatario</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  id="recipient-name"
                  maxLength={120}
                  required
                  value={formValues.recipient_name}
                  onChange={(e) => updateField('recipient_name', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900" htmlFor="phone">Teléfono</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  id="phone"
                  maxLength={40}
                  required
                  type="tel"
                  value={formValues.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-900" htmlFor="street">Calle</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  id="street"
                  maxLength={160}
                  required
                  value={formValues.street}
                  onChange={(e) => updateField('street', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900" htmlFor="street-number">Número</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  id="street-number"
                  maxLength={20}
                  required
                  value={formValues.street_number}
                  onChange={(e) => updateField('street_number', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900" htmlFor="floor">Piso (opcional)</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  id="floor"
                  maxLength={20}
                  value={formValues.floor}
                  onChange={(e) => updateField('floor', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900" htmlFor="apartment">Departamento (opcional)</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  id="apartment"
                  maxLength={20}
                  value={formValues.apartment}
                  onChange={(e) => updateField('apartment', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900" htmlFor="city">Ciudad</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  id="city"
                  maxLength={120}
                  required
                  value={formValues.city}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900" htmlFor="province">Provincia</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  id="province"
                  maxLength={120}
                  required
                  value={formValues.province}
                  onChange={(e) => updateField('province', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900" htmlFor="postal-code">Código postal</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  id="postal-code"
                  maxLength={20}
                  required
                  value={formValues.postal_code}
                  onChange={(e) => updateField('postal_code', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-900" htmlFor="reference">Referencia (opcional)</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                id="reference"
                maxLength={255}
                placeholder="Ej: Portón azul, timbre 2"
                value={formValues.reference}
                onChange={(e) => updateField('reference', e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <input
                checked={formValues.is_default}
                className="size-4 rounded border-slate-300"
                type="checkbox"
                onChange={(e) => updateField('is_default', e.target.checked)}
              />
              Establecer como dirección predeterminada
            </label>

            {formFeedback ? (
              <p
                className={`rounded-xl px-4 py-3 text-sm ${formFeedback.type === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-900' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}
                role={formFeedback.type === 'success' ? 'status' : 'alert'}
              >
                {formFeedback.message}
              </p>
            ) : null}

            <div className="flex gap-3">
              <button
                className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? 'Guardando...' : editingId !== null ? 'Actualizar dirección' : 'Guardar dirección'}
              </button>
              <button
                className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={closeForm}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}
