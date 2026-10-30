import { useId, useState, type FormEvent } from 'react'
import { ThemeToggle } from '../components/shell/ThemeToggle'
import { WindMark } from '../components/shell/WindMark'
import { SURFACE_CLASS } from '../components/ui/Card'
import { ApiError, signIn } from '../lib/api'

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return 'Wrong username or password.'
  if (error instanceof ApiError && error.status === 503) return 'Sign-in is not set up on the server.'
  return 'Could not reach the server. Try again.'
}

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-line bg-surface px-3 text-[14px] text-ink shadow-card transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-accent'

export function SignIn() {
  const userId = useId()
  const passwordId = useId()
  const errorId = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      // Success stores the session, and the app switches to the dashboard.
      await signIn(username.trim(), password)
    } catch (err) {
      setError(messageFor(err))
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-end px-4 pt-4 sm:px-6">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[380px]">
          <div className="mb-6 flex flex-col items-center text-center">
            <WindMark className="size-10" />
            <h1 className="m-0 mt-4 text-[20px] font-semibold tracking-[-0.02em] text-ink">Sign in to Wind Desk</h1>
            <p className="m-0 mt-1 text-[13px] text-ink-3">GB day-ahead wind forecast and its track record</p>
          </div>

          <form onSubmit={onSubmit} noValidate className={`flex flex-col gap-4 p-6 ${SURFACE_CLASS}`}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={userId} className="text-[12.5px] font-medium text-ink-2">
                Username
              </label>
              <input
                id={userId}
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={error !== null}
                aria-describedby={error ? errorId : undefined}
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={passwordId} className="text-[12.5px] font-medium text-ink-2">
                Password
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={error !== null}
                  aria-describedby={error ? errorId : undefined}
                  className={`${INPUT_CLASS} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-1.5 h-7 -translate-y-1/2 rounded-md px-2 text-[12px] font-medium text-ink-3 transition-colors hover:bg-surface-hover hover:text-ink"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error ? (
              <p
                id={errorId}
                role="alert"
                className="m-0 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-above-text"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending || username.trim() === '' || password === ''}
              className="mt-1 h-10 rounded-lg bg-accent text-[14px] font-medium text-white shadow-card transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="m-0 mt-5 text-center text-[12px] text-ink-3">
            Access is limited to invited reviewers. Your session ends when you close the tab.
          </p>
        </div>
      </main>
    </div>
  )
}
