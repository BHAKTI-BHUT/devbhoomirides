// User-facing errors. Server functions throw these so the browser only ever sees a
// friendly message — never raw database or provider errors.
export class AppError extends Error {
  constructor(
    message: string,
    public code: 'unauthenticated' | 'forbidden' | 'suspended' | 'not_found' | 'invalid' | 'internal' = 'invalid',
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const MESSAGES = {
  unauthenticated: 'Please sign in to continue.',
  forbidden: 'You are not authorized to perform this action.',
  suspended: 'Your account is suspended. Please contact Devbhoomi Rides support.',
  internal: 'Something went wrong. Please try again.',
} as const

/** Wraps unexpected errors so internals are logged server-side but never leaked. */
export function toPublicError(err: unknown): AppError {
  if (err instanceof AppError) return err
  console.error('[server]', err)
  return new AppError(MESSAGES.internal, 'internal')
}
