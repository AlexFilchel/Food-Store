import axios from 'axios'

export interface ProblemDetailFieldError {
  field: string
  message: string
}

export interface ProblemDetails {
  title: string
  detail: string
  status: number
  code: string
  errors?: ProblemDetailFieldError[]
}

function normalizeField(field: string) {
  return field.replace(/^body\./, '')
}

export function getProblemDetails(error: unknown): ProblemDetails | null {
  if (!axios.isAxiosError(error)) {
    return null
  }

  return (error.response?.data as ProblemDetails | undefined) ?? null
}

export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.') {
  return getProblemDetails(error)?.detail ?? fallback
}

export function getFieldErrors(error: unknown) {
  const problem = getProblemDetails(error)

  if (!problem?.errors?.length) {
    return {} as Record<string, string>
  }

  return problem.errors.reduce<Record<string, string>>((accumulator, issue) => {
    const field = normalizeField(issue.field)

    if (!accumulator[field]) {
      accumulator[field] = issue.message
    }

    return accumulator
  }, {})
}

export function isProblemStatus(error: unknown, status: number) {
  if (!axios.isAxiosError(error)) {
    return false
  }

  return error.response?.status === status
}

export function isAuthProblem(error: unknown) {
  return isProblemStatus(error, 401)
}
