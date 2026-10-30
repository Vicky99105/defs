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
  'h-11 w-full rounded-[10px] border border-line bg-field px-3.5 text-[14px] text-ink transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-accent'

const POINTS = ['Latest Elexon forecast before the cutoff', 'Typical error, bias and trend', 'Where the misses come from']

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
    <div className="grid min-h-screen lg:grid-cols-[minmax(420px,44%)_1fr]">
      <section className="flex flex-col justify-between gap-10 bg-side px-6 py-8 text-side-ink sm:px-10 lg:px-12 lg:py-10">
        <div className="flex items-center gap-3">
          <WindMark className="size-9" />
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Wind Desk</span>
            <span className="text-[11px] tracking-[0.04em] text-side-muted">GB day-ahead wind</span>
          </span>
        </div>

        <div className="max-w-[400px]">
          <p className="m-0 text-[11px] font-semibold tracking-[0.14em] text-gold uppercase">Before the 11:00 auction</p>
          <h2 className="m-0 mt-3 text-[26px] leading-[1.25] font-semibold tracking-[-0.02em] sm:text-[30px]">
            Know how far to trust tomorrow&apos;s wind forecast.
          </h2>
          <p className="m-0 mt-3 text-[14px] text-side-muted">
            The forecast you have at decision time, and how wrong it has been lately.
          </p>
          <ul className="m-0 mt-6 hidden list-none flex-col gap-2.5 p-0 sm:flex">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-[13px]">
                <span className="h-px w-4 bg-gold" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="m-0 hidden text-[11.5px] text-side-muted lg:block">Data: Elexon BMRS · All times UK</p>
      </section>

      <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="absolute top-5 right-5 sm:right-8">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[400px]">
          <h1 className="m-0 text-[24px] font-semibold tracking-[-0.02em] text-ink">Sign in</h1>
          <p className="m-0 mt-1 mb-6 text-[13.5px] text-ink-3">Use the reviewer credentials you were sent.</p>

          <form onSubmit={onSubmit} noValidate className={`flex flex-col gap-4 p-6 sm:p-7 ${SURFACE_CLASS}`}>
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
                className="m-0 rounded-[10px] border border-line bg-field px-3 py-2 text-[12.5px] text-above-text"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending || username.trim() === '' || password === ''}
              className="mt-1 h-11 rounded-[10px] bg-accent text-[14px] font-medium text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="m-0 mt-5 text-center text-[12px] text-ink-3">
            Access is by invitation only. Your session ends when you close the tab.
          </p>
        </div>
      </main>
    </div>
  )
}
