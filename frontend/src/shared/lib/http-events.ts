export type ShellEvent =
  | { type: 'session-expired'; message: string }
  | { type: 'forbidden'; message: string }
  | { type: 'api-error'; message: string }

type ShellEventListener = (event: ShellEvent) => void

const listeners = new Set<ShellEventListener>()

export function emitShellEvent(event: ShellEvent) {
  listeners.forEach((listener) => listener(event))
}

export function subscribeToShellEvents(listener: ShellEventListener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}
