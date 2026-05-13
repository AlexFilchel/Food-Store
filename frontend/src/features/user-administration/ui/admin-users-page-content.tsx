import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import type { AdminUserSummary, UserRoleCode } from '@/entities/user-administration/model/types'
import { useAdminUserCreateMutation, useAdminUsersListQuery } from '@/features/user-administration/model/hooks'
import { getErrorMessage, getFieldErrors, getProblemDetails } from '@/shared/api/problem-details'

const ROLE_OPTIONS: { value: UserRoleCode | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STOCK', label: 'Stock' },
  { value: 'PEDIDOS', label: 'Pedidos' },
  { value: 'CLIENT', label: 'Cliente' },
]

function statusLabel(isActive: boolean) {
  return isActive ? 'Activo' : 'Inactivo'
}

function statusBadgeClass(isActive: boolean) {
  return isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
}

export function AdminUsersPageContent() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRoleCode | 'ALL'>('ALL')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const size = 20

  const filters = useMemo(() => {
    const normalized: { search?: string; role?: UserRoleCode; is_active?: boolean; page: number; size: number } = {
      page,
      size,
    }
    if (search.trim()) {
      normalized.search = search.trim()
    }
    if (role !== 'ALL') {
      normalized.role = role
    }
    if (status === 'active') {
      normalized.is_active = true
    }
    if (status === 'inactive') {
      normalized.is_active = false
    }
    return normalized
  }, [page, role, search, size, status])

  const query = useAdminUsersListQuery(filters)
  const users = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, query.data?.pages ?? 1)
  const problem = query.error ? getProblemDetails(query.error) : null
  const isForbidden = problem?.status === 403

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">ADMIN</span>
        <h2 className="mt-4 text-3xl font-semibold text-slate-950">Administración de usuarios</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Buscá usuarios, revisá roles y administrá el estado de sus cuentas.
        </p>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="admin-user-search">Buscar</label>
            <input
              id="admin-user-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Nombre, apellido o email"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="admin-user-role">Rol</label>
            <select
              id="admin-user-role"
              value={role}
              onChange={(event) => {
                setRole(event.target.value as UserRoleCode | 'ALL')
                setPage(1)
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="admin-user-status">Estado</label>
            <select
              id="admin-user-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as 'all' | 'active' | 'inactive')
                setPage(1)
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Total: <span className="font-semibold text-slate-900">{total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-950">Crear usuario</h3>
        <p className="mt-1 text-sm text-slate-600">Generá nuevos usuarios desde administración.</p>
        <AdminUserCreateForm />
      </div>

      {query.isLoading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Cargando usuarios...</p>
        </div>
      ) : null}

      {query.isError ? (
        <div className="rounded-3xl border border-dashed border-rose-300 bg-white p-8 text-center">
          <p className="text-rose-700">
            {isForbidden
              ? 'No tenés permisos para acceder a la administración de usuarios.'
              : 'No pudimos cargar los usuarios. Probá de nuevo en un momento.'}
          </p>
        </div>
      ) : null}

      {!query.isLoading && !query.isError && users.length === 0 ? (
        <div className="space-y-2 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-900">No hay usuarios para mostrar</h3>
          <p className="text-sm text-slate-600">Probá ajustar los filtros o revisá más tarde.</p>
        </div>
      ) : null}

      {!query.isLoading && !query.isError && users.length > 0 ? (
        <div className="space-y-4">
          {users.map((user) => (
            <AdminUserCard key={user.id} user={user} />
          ))}
        </div>
      ) : null}

      {!query.isLoading && !query.isError && users.length > 0 ? (
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p>
            Página {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function AdminUserCard({ user }: { user: AdminUserSummary }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-lg font-semibold text-slate-950">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-sm text-slate-600">{user.email}</p>
          <p className="text-xs text-slate-500">Alta: {new Date(user.created_at).toLocaleDateString('es-AR')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <span key={role} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {role}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(user.is_active)}`}>
            {statusLabel(user.is_active)}
          </span>
          <Link
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            to={routePaths.adminUserDetail.replace(':userId', String(user.id))}
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  )
}

function AdminUserCreateForm() {
  const createMutation = useAdminUserCreateMutation()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    is_active: true,
  })
  const [roles, setRoles] = useState<UserRoleCode[]>(['CLIENT'])
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    try {
      await createMutation.mutateAsync({
        ...form,
        role_codes: roles,
      })
      setForm({ first_name: '', last_name: '', email: '', password: '', is_active: true })
      setRoles(['CLIENT'])
    } catch (cause) {
      setError(getErrorMessage(cause, 'No pudimos crear el usuario.'))
      setFieldErrors(getFieldErrors(cause))
    }
  }

  function toggleRole(role: UserRoleCode) {
    setRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    )
  }

  return (
    <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <label className="space-y-2">
        <span className="text-sm text-slate-700">Nombre</span>
        <input
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          value={form.first_name}
          onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
        />
        {fieldErrors.first_name ? <span className="text-xs text-rose-600">{fieldErrors.first_name}</span> : null}
      </label>
      <label className="space-y-2">
        <span className="text-sm text-slate-700">Apellido</span>
        <input
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          value={form.last_name}
          onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
        />
        {fieldErrors.last_name ? <span className="text-xs text-rose-600">{fieldErrors.last_name}</span> : null}
      </label>
      <label className="space-y-2">
        <span className="text-sm text-slate-700">Email</span>
        <input
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
        {fieldErrors.email ? <span className="text-xs text-rose-600">{fieldErrors.email}</span> : null}
      </label>
      <label className="space-y-2">
        <span className="text-sm text-slate-700">Contraseña</span>
        <input
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        />
        {fieldErrors.password ? <span className="text-xs text-rose-600">{fieldErrors.password}</span> : null}
      </label>
      <div className="md:col-span-2 space-y-2">
        <span className="text-sm text-slate-700">Roles</span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                roles.includes(option.value as UserRoleCode)
                  ? 'border-sky-300 bg-sky-50 text-sky-900'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300"
                checked={roles.includes(option.value as UserRoleCode)}
                onChange={() => toggleRole(option.value as UserRoleCode)}
              />
              {option.label}
            </label>
          ))}
        </div>
        {fieldErrors.role_codes ? <span className="text-xs text-rose-600">{fieldErrors.role_codes}</span> : null}
      </div>
      <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300"
          checked={form.is_active}
          onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
        />
        Usuario activo
      </label>
      <div className="md:col-span-2">
        <button
          className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          type="submit"
          disabled={createMutation.isPending || roles.length === 0}
        >
          Crear usuario
        </button>
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      </div>
    </form>
  )
}
