import { useState, type FormEvent } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-9">
        <div className="text-center">
          <img
            src="/images/north-star-logo.JPG"
            alt="North Star logo"
            className="mx-auto h-16 w-16 rounded-full object-cover"
          />
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-amber-600">
            Welcome back
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-blue-950">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign in to your North Star account.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className="block text-sm font-semibold text-blue-950">
              Email address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-blue-800 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold text-blue-950">
              Password
            </label>
            <div className="mt-2 flex rounded-md border border-slate-300 focus-within:border-blue-800 focus-within:ring-2 focus-within:ring-blue-100">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="min-w-0 flex-1 rounded-l-md px-4 py-3 text-blue-950 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="rounded-r-md px-3 text-sm font-semibold text-blue-800 hover:bg-slate-50"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="mt-2 text-right">
              <a
                href="mailto:nothstarprime100@gmail.com?subject=Password%20help"
                className="text-sm font-semibold text-blue-800 hover:underline"
              >
                Forgot password?
              </a>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="remember"
              className="h-4 w-4 rounded border-slate-300 accent-blue-950"
            />
            Remember me
          </label>

          {submitted && (
            <p role="status" className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Sign-in is not connected yet. Please contact the club to access an account.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-amber-400 px-5 py-3 font-bold text-blue-950 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-950"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Need an account?{' '}
          <a href="mailto:nothstarprime100@gmail.com" className="font-semibold text-blue-800 hover:underline">
            Contact us
          </a>
        </p>
      </div>
    </section>
  );
}