import { FormEvent, useEffect, useMemo, useState } from 'react'

import {
  useChangeCustomerPasswordMutation,
  useCustomerProfileQuery,
  useUpdateCustomerProfileMutation,
} from '@/features/customer-profile/model/hooks'
import {
  useCreateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
  useDeliveryAddressListQuery,
  useSetDefaultDeliveryAddressMutation,
  useUpdateDeliveryAddressMutation,
} from '@/features/delivery-addresses/model/hooks'
import type { DeliveryAddressCreateRequest } from '@/entities/delivery-addresses/model/types'
import { getErrorMessage, getFieldErrors, getProblemDetails } from '@/shared/api/problem-details'

const defaultAddressForm: DeliveryAddressCreateRequest = {
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

const ARGENTINE_PROVINCES = [
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Ciudad Autónoma de Buenos Aires',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
] as const

function normalizeProvince(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function isArgentineProvince(value: string) {
  const normalizedValue = normalizeProvince(value.trim())
  return ARGENTINE_PROVINCES.some((province) => normalizeProvince(province) === normalizedValue)
}

export function AppPage() {
  const profileQuery = useCustomerProfileQuery()
  const updateMutation = useUpdateCustomerProfileMutation()
  const passwordMutation = useChangeCustomerPasswordMutation()

  const addressListQuery = useDeliveryAddressListQuery()
  const createAddressMutation = useCreateDeliveryAddressMutation()
  const updateAddressMutation = useUpdateDeliveryAddressMutation()
  const deleteAddressMutation = useDeleteDeliveryAddressMutation()
  const setDefaultAddressMutation = useSetDefaultDeliveryAddressMutation()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMismatchError, setPasswordMismatchError] = useState<string | null>(null)

  const [editingAddressId, setEditingAddressId] = useState<number | null>(null)
  const [addressForm, setAddressForm] = useState<DeliveryAddressCreateRequest>(defaultAddressForm)
  const [isProvincePickerOpen, setIsProvincePickerOpen] = useState(false)
  const [isProvinceSelected, setIsProvinceSelected] = useState(false)
  const [provinceSelectionError, setProvinceSelectionError] = useState<string | null>(null)

  const fieldErrors = useMemo(() => getFieldErrors(updateMutation.error), [updateMutation.error])
  const passwordFieldErrors = useMemo(() => getFieldErrors(passwordMutation.error), [passwordMutation.error])
  const addressFieldErrors = useMemo(
    () => getFieldErrors(createAddressMutation.error ?? updateAddressMutation.error),
    [createAddressMutation.error, updateAddressMutation.error],
  )
  const filteredArgentineProvinces = useMemo(() => {
    const query = normalizeProvince(addressForm.province.trim())

    if (!query) {
      return ARGENTINE_PROVINCES
    }

    return ARGENTINE_PROVINCES.filter((province) => normalizeProvince(province).startsWith(query))
  }, [addressForm.province])

  function resetAddressMutationFeedback() {
    createAddressMutation.reset()
    updateAddressMutation.reset()
  }

  function resetAddressForm() {
    setAddressForm(defaultAddressForm)
    setEditingAddressId(null)
    setIsProvinceSelected(false)
    setIsProvincePickerOpen(false)
    setProvinceSelectionError(null)
  }

  function selectProvince(province: string) {
    setAddressForm((current) => ({ ...current, province }))
    setIsProvinceSelected(true)
    setIsProvincePickerOpen(false)
    setProvinceSelectionError(null)
  }

  useEffect(() => {
    if (!profileQuery.data) {
      return
    }
    setFirstName((current) => (current === '' ? profileQuery.data.first_name : current))
    setLastName((current) => (current === '' ? profileQuery.data.last_name : current))
    setEmail((current) => (current === '' ? profileQuery.data.email : current))
  }, [profileQuery.data])

  if (profileQuery.isLoading) {
    return <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">Cargando perfil...</section>
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await updateMutation.mutateAsync({ first_name: firstName, last_name: lastName, email })
    } catch {
      return
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordMismatchError(null)
    if (newPassword !== confirmPassword) {
      setPasswordMismatchError('La confirmación no coincide con la nueva contraseña.')
      return
    }
    try {
      await passwordMutation.mutateAsync({ current_password: currentPassword, new_password: newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      return
    }
  }

  async function handleAddressSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetAddressMutationFeedback()
    if (!isProvinceSelected || !isArgentineProvince(addressForm.province)) {
      setProvinceSelectionError('Seleccioná una provincia de la lista.')
      setIsProvincePickerOpen(true)
      return
    }
    try {
      if (editingAddressId) {
        await updateAddressMutation.mutateAsync({ addressId: editingAddressId, payload: addressForm })
      } else {
        await createAddressMutation.mutateAsync(addressForm)
      }
      resetAddressForm()
    } catch {
      return
    }
  }

  return (
    <section className="space-y-6">
      <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-900">CLIENT</span>
        <h2 className="mt-4 text-3xl font-semibold text-slate-950">Espacio del cliente</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Gestioná tus datos personales y credenciales de forma segura.</p>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-950">Mis direcciones de entrega</h3>
        {addressListQuery.isLoading ? <p className="mt-2 text-sm text-slate-600">Cargando direcciones...</p> : null}
        {addressListQuery.error ? <p role="alert" className="mt-2 text-sm text-rose-700">{getErrorMessage(addressListQuery.error)}</p> : null}
        {addressListQuery.data && addressListQuery.data.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Todavía no tenés direcciones guardadas.</p>
        ) : null}
        {addressListQuery.data?.map((address) => (
          <div className="mt-3 rounded-xl border border-slate-200 p-4" key={address.id}>
            <p className="font-semibold text-slate-900">{address.recipient_name}</p>
            <p className="text-sm text-slate-700">{address.street} {address.street_number}, {address.city}</p>
            {address.is_default ? <span className="mt-2 inline-flex rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Predeterminada</span> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded border px-3 py-1 text-sm" type="button" onClick={() => {
                resetAddressMutationFeedback()
                setProvinceSelectionError(null)
                setIsProvinceSelected(true)
                setIsProvincePickerOpen(false)
                setEditingAddressId(address.id)
                setAddressForm({
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
                })
              }}>Editar</button>
              <button className="rounded border px-3 py-1 text-sm" disabled={deleteAddressMutation.isPending} type="button" onClick={() => void deleteAddressMutation.mutateAsync(address.id)}>Eliminar</button>
              {!address.is_default ? (
                <button className="rounded border px-3 py-1 text-sm" disabled={setDefaultAddressMutation.isPending} type="button" onClick={() => void setDefaultAddressMutation.mutateAsync(address.id)}>Marcar como predeterminada</button>
              ) : null}
            </div>
          </div>
        ))}

        {(createAddressMutation.error ?? updateAddressMutation.error) ? (
          <p role="alert" className="mt-3 text-sm text-rose-700">{getErrorMessage(createAddressMutation.error ?? updateAddressMutation.error)}</p>
        ) : null}
        {createAddressMutation.isSuccess || updateAddressMutation.isSuccess ? (
          <p className="mt-3 text-sm text-emerald-700">Dirección guardada correctamente.</p>
        ) : null}

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleAddressSubmit(event)}>
          <AddressField label="Destinatario" name="recipient_name" value={addressForm.recipient_name} onChange={(value) => setAddressForm((current) => ({ ...current, recipient_name: value }))} error={addressFieldErrors.recipient_name} />
          <AddressField label="Teléfono" name="phone" value={addressForm.phone} onChange={(value) => setAddressForm((current) => ({ ...current, phone: value }))} error={addressFieldErrors.phone} />
          <AddressField label="Calle" name="street" value={addressForm.street} onChange={(value) => setAddressForm((current) => ({ ...current, street: value }))} error={addressFieldErrors.street} />
          <AddressField label="Número" name="street_number" value={addressForm.street_number} onChange={(value) => setAddressForm((current) => ({ ...current, street_number: value }))} error={addressFieldErrors.street_number} />
          <AddressField label="Piso" name="floor" value={addressForm.floor ?? ''} onChange={(value) => setAddressForm((current) => ({ ...current, floor: value }))} error={addressFieldErrors.floor} />
          <AddressField label="Depto" name="apartment" value={addressForm.apartment ?? ''} onChange={(value) => setAddressForm((current) => ({ ...current, apartment: value }))} error={addressFieldErrors.apartment} />
          <AddressField label="Ciudad" name="city" value={addressForm.city} onChange={(value) => setAddressForm((current) => ({ ...current, city: value }))} error={addressFieldErrors.city} />
          <ProvinceField
            error={provinceSelectionError ?? addressFieldErrors.province}
            filteredProvinces={filteredArgentineProvinces}
            isOpen={isProvincePickerOpen}
            onBlur={() => setIsProvincePickerOpen(false)}
            onChange={(value) => {
              setAddressForm((current) => ({ ...current, province: value }))
              setIsProvinceSelected(false)
              setProvinceSelectionError(null)
              setIsProvincePickerOpen(true)
            }}
            onFocus={() => setIsProvincePickerOpen(true)}
            onSelect={selectProvince}
            value={addressForm.province}
          />
          <AddressField label="Código postal" name="postal_code" value={addressForm.postal_code} onChange={(value) => setAddressForm((current) => ({ ...current, postal_code: value }))} error={addressFieldErrors.postal_code} />
          <AddressField label="Referencia" name="reference" value={addressForm.reference ?? ''} onChange={(value) => setAddressForm((current) => ({ ...current, reference: value }))} error={addressFieldErrors.reference} />
          <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
            <input checked={Boolean(addressForm.is_default)} onChange={(event) => setAddressForm((current) => ({ ...current, is_default: event.target.checked }))} type="checkbox" />
            Usar como dirección predeterminada
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button className="rounded bg-slate-900 px-4 py-2 text-white" disabled={createAddressMutation.isPending || updateAddressMutation.isPending} type="submit">
              {editingAddressId ? 'Guardar cambios' : 'Agregar dirección'}
            </button>
            {editingAddressId ? <button className="rounded border px-4 py-2" type="button" onClick={() => { resetAddressMutationFeedback(); resetAddressForm() }}>Cancelar edición</button> : null}
          </div>
        </form>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-950">Mi perfil</h3>
        {updateMutation.isSuccess ? <p className="mt-2 text-sm text-emerald-700">Perfil actualizado correctamente.</p> : null}
        {updateMutation.error ? <p role="alert" className="mt-2 text-sm text-rose-700">{getErrorMessage(updateMutation.error)}</p> : null}
        <form className="mt-4 space-y-3" onSubmit={(event) => void handleProfileSubmit(event)}>
          <label className="block text-sm">Nombre
            <input aria-label="Nombre" className="mt-1 w-full rounded border px-3 py-2" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            {fieldErrors.first_name ? <span className="text-xs text-rose-700">{fieldErrors.first_name}</span> : null}
          </label>
          <label className="block text-sm">Apellido
            <input aria-label="Apellido" className="mt-1 w-full rounded border px-3 py-2" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            {fieldErrors.last_name ? <span className="text-xs text-rose-700">{fieldErrors.last_name}</span> : null}
          </label>
          <label className="block text-sm">Email
            <input aria-label="Email" className="mt-1 w-full rounded border px-3 py-2" value={email} onChange={(event) => setEmail(event.target.value)} />
            {fieldErrors.email ? <span className="text-xs text-rose-700">{fieldErrors.email}</span> : null}
          </label>
          <button className="rounded bg-slate-900 px-4 py-2 text-white" disabled={updateMutation.isPending} type="submit">Guardar perfil</button>
        </form>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-950">Cambiar contraseña</h3>
        {passwordMutation.isSuccess ? <p className="mt-2 text-sm text-emerald-700">Contraseña actualizada correctamente.</p> : null}
        {passwordMutation.error ? (
          <p role="alert" className="mt-2 text-sm text-rose-700">{getProblemDetails(passwordMutation.error)?.detail ?? 'No se pudo actualizar la contraseña.'}</p>
        ) : null}
        <form className="mt-4 space-y-3" onSubmit={(event) => void handlePasswordSubmit(event)}>
          <label className="block text-sm">Contraseña actual
            <input aria-label="Contraseña actual" className="mt-1 w-full rounded border px-3 py-2" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label className="block text-sm">Nueva contraseña
            <input aria-label="Nueva contraseña" className="mt-1 w-full rounded border px-3 py-2" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            {passwordFieldErrors.new_password ? <span className="text-xs text-rose-700">{passwordFieldErrors.new_password}</span> : null}
          </label>
          <label className="block text-sm">Confirmar nueva contraseña
            <input aria-label="Confirmar nueva contraseña" className="mt-1 w-full rounded border px-3 py-2" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>
          {passwordMismatchError ? <p role="alert" className="text-sm text-rose-700">{passwordMismatchError}</p> : null}
          <button className="rounded bg-slate-900 px-4 py-2 text-white" disabled={passwordMutation.isPending} type="submit">Actualizar contraseña</button>
        </form>
      </article>
    </section>
  )
}

interface AddressFieldProps {
  label: string
  name: string
  value: string
  error?: string
  onChange: (value: string) => void
}

function AddressField({ label, name, value, onChange, error }: AddressFieldProps) {
  return (
    <label className="block text-sm">
      {label}
      <input aria-label={label} name={name} className="mt-1 w-full rounded border px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </label>
  )
}

interface ProvinceFieldProps {
  value: string
  error?: string
  filteredProvinces: readonly string[]
  isOpen: boolean
  onBlur: () => void
  onChange: (value: string) => void
  onFocus: () => void
  onSelect: (province: string) => void
}

function ProvinceField({ value, error, filteredProvinces, isOpen, onBlur, onChange, onFocus, onSelect }: ProvinceFieldProps) {
  return (
    <label className="relative block text-sm">
      Provincia
      <input
        aria-autocomplete="list"
        aria-controls="province-options"
        aria-expanded={isOpen}
        aria-label="Provincia"
        className="mt-1 w-full rounded border px-3 py-2"
        name="province"
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        role="combobox"
        value={value}
      />
      {isOpen ? (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-slate-200 bg-white shadow-lg" id="province-options" role="listbox">
          {filteredProvinces.length > 0 ? (
            filteredProvinces.map((province) => (
              <button
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                key={province}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(province)}
                role="option"
                type="button"
              >
                {province}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-600">No hay provincias que coincidan.</p>
          )}
        </div>
      ) : null}
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </label>
  )
}
