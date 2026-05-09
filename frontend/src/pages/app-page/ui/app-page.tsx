import { FormEvent, useEffect, useMemo, useState } from 'react'

import {
  useChangeCustomerPasswordMutation,
  useCustomerProfileQuery,
  useUpdateCustomerProfileMutation,
} from '@/features/customer-profile/model/hooks'
import { getErrorMessage, getFieldErrors, getProblemDetails } from '@/shared/api/problem-details'

export function AppPage() {
  const profileQuery = useCustomerProfileQuery()
  const updateMutation = useUpdateCustomerProfileMutation()
  const passwordMutation = useChangeCustomerPasswordMutation()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMismatchError, setPasswordMismatchError] = useState<string | null>(null)

  const fieldErrors = useMemo(() => getFieldErrors(updateMutation.error), [updateMutation.error])
  const passwordFieldErrors = useMemo(() => getFieldErrors(passwordMutation.error), [passwordMutation.error])

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

  return (
    <section className="space-y-6">
      <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-900">CLIENT</span>
        <h2 className="mt-4 text-3xl font-semibold text-slate-950">Espacio del cliente</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Gestioná tus datos personales y credenciales de forma segura.</p>
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
