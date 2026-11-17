import React, { useEffect, useState } from 'react';
import { ChevronDown, Eye, EyeOff, KeyRound, Mail, X } from 'lucide-react';
import { FinanciaLogo } from './FinanciaLogo';
import { AlpineAuthCanvas } from './AlpineAuthCanvas';
import {
  AuthMode,
  AuthProvider,
  AuthSession,
  evaluatePasswordStrength,
  validateAuthCredentials,
} from '../frontend/utils/authEngine';

interface AuthPageModalProps {
  open: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onAuthenticated: (session: AuthSession) => void;
}

export const AuthPageModal: React.FC<AuthPageModalProps> = ({
  open,
  initialMode = 'signup',
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [emailFormOpen, setEmailFormOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState('');
  const [submittingProvider, setSubmittingProvider] = useState<AuthProvider | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setServerError('');
      setFieldErrors({});
    }
  }, [open, initialMode]);

  if (!open) return null;

  const strength = evaluatePasswordStrength(password);

  const handleToggleMode = () => {
    setMode((prev) => (prev === 'signup' ? 'login' : 'signup'));
    setServerError('');
    setFieldErrors({});
  };

  const handleProviderSignIn = async (provider: Exclude<AuthProvider, 'email'>) => {
    setServerError('');
    setSubmittingProvider(provider);
    try {
      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json()) as {
        user?: AuthSession['user'];
        token?: string;
        error?: string;
      };
      if (!res.ok || !data.user || !data.token) {
        setServerError(data.error || 'Could not complete sign-in. Please try again.');
        return;
      }
      onAuthenticated({ user: data.user, token: data.token });
      onClose();
    } catch {
      setServerError('Network connection error while signing in.');
    } finally {
      setSubmittingProvider(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const check = validateAuthCredentials({
      mode,
      email,
      password,
      name: mode === 'signup' ? name : undefined,
    });
    if (!check.valid) {
      setFieldErrors(check.fieldErrors);
      return;
    }

    setFieldErrors({});
    setSubmittingProvider('email');

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: mode === 'signup' ? name.trim() : undefined,
        }),
      });
      const data = (await res.json()) as {
        user?: AuthSession['user'];
        token?: string;
        error?: string;
        fieldErrors?: { name?: string; email?: string; password?: string };
      };
      if (!res.ok || !data.user || !data.token) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setServerError(data.error || 'Authentication failed. Please check your details.');
        return;
      }
      onAuthenticated({ user: data.user, token: data.token });
      onClose();
    } catch {
      setServerError('Unable to reach Financia authentication service.');
    } finally {
      setSubmittingProvider(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'signup' ? 'Financia Sign up' : 'Financia Log in'}
      data-testid="auth-page-modal"
      className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col lg:grid lg:grid-cols-2 p-2.5 sm:p-3 gap-3 overflow-y-auto lg:overflow-hidden"
    >
      {/* Left Split Pane: Atmospheric Alpine Explorer Artwork */}
      <div className="hidden lg:block h-full min-h-[540px]">
        <AlpineAuthCanvas />
      </div>

      {/* Right Split Pane: Minimalist Black Authentication Panel */}
      <div className="flex-1 flex flex-col justify-between bg-[#000000] rounded-2xl px-5 sm:px-10 py-5 sm:py-6 min-h-full lg:overflow-y-auto">
        {/* Top Row: Centered Brand Wordmark + Close Button */}
        <div className="relative flex items-center justify-center shrink-0 min-h-[36px]">
          <FinanciaLogo variant="light" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication page"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#B2B5BE] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile/Tablet Atmospheric Strip */}
        <div className="lg:hidden mt-4">
          <AlpineAuthCanvas compact />
        </div>

        {/* Centered Auth Card Column */}
        <div className="w-full max-w-[360px] mx-auto my-auto py-8 sm:py-10">
          <h1 className="font-display font-bold text-white text-[26px] text-center tracking-[-0.02em] mb-7">
            {mode === 'signup' ? 'Sign up' : 'Log in'}
          </h1>

          {serverError && (
            <div
              role="alert"
              className="mb-4 px-3.5 py-2.5 rounded-lg bg-[#F23645]/15 border border-[#F23645]/45 text-xs text-[#FCA5A5] leading-relaxed"
            >
              {serverError}
            </div>
          )}

          {!emailFormOpen ? (
            <div>
              {/* Primary White Google Sign-In CTA */}
              <button
                type="button"
                onClick={() => handleProviderSignIn('google')}
                disabled={submittingProvider !== null}
                className="w-full h-11 rounded-lg bg-white hover:bg-[#F3F4F6] text-[#131722] font-medium text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.21-3.21C17.55 1.69 14.95.6 12 .6 7.36.6 3.36 3.26 1.41 7.14l3.74 2.9C6.03 7.32 8.77 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.44a5.51 5.51 0 0 1-2.39 3.61l3.69 2.86c2.16-1.99 3.75-4.93 3.75-8.66z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.15 14.96A7.18 7.18 0 0 1 4.78 12c0-1.03.18-2.02.49-2.96l-3.74-2.9A11.86 11.86 0 0 0 .2 12c0 1.92.46 3.73 1.28 5.34l3.67-2.38z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.4c3.24 0 5.95-1.07 7.93-2.91l-3.69-2.86c-1.07.72-2.44 1.15-4.24 1.15-3.23 0-5.97-2.28-6.85-5.32l-3.67 2.38C3.36 19.94 7.36 23.4 12 23.4z"
                  />
                </svg>
                <span>
                  {submittingProvider === 'google'
                    ? 'Connecting Google...'
                    : 'Continue with Google'}
                </span>
              </button>

              {/* Show More Options Disclosure */}
              <div className="mt-3.5 text-center">
                <button
                  type="button"
                  onClick={() => setMoreOptionsOpen((prev) => !prev)}
                  aria-expanded={moreOptionsOpen}
                  className="text-xs font-medium text-[#4E8EFF] hover:text-[#78A9FF] inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{moreOptionsOpen ? 'Hide extra options' : 'Show more options'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      moreOptionsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {moreOptionsOpen && (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleProviderSignIn('apple')}
                    disabled={submittingProvider !== null}
                    className="w-full h-10 rounded-lg border border-[#2A2E39] hover:border-[#525766] bg-[#0B0D12] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M16.36 1.64c0 1.14-.42 2.2-1.1 3.01-.73.86-1.93 1.52-3.09 1.43-.14-1.11.41-2.26 1.11-3.04.74-.83 2.02-1.45 3.08-1.4zm3.99 15.32c-.57 1.32-.85 1.91-1.59 3.08-1.03 1.62-2.49 3.63-4.29 3.65-1.61.02-2.02-1.04-4.2-1.03-2.18.01-2.64 1.05-4.25 1.03-1.8-.02-3.18-1.83-4.21-3.45-2.89-4.54-3.19-9.86-1.41-12.69 1.26-2 3.25-3.17 5.13-3.17 1.91 0 3.11 1.05 4.69 1.05 1.53 0 2.46-1.06 4.68-1.06 1.67 0 3.44.91 4.7 2.48-4.13 2.26-3.46 8.15.75 10.11z" />
                    </svg>
                    <span>Continue with Apple</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProviderSignIn('github')}
                    disabled={submittingProvider !== null}
                    className="w-full h-10 rounded-lg border border-[#2A2E39] hover:border-[#525766] bg-[#0B0D12] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.42.36.79 1.07.79 2.15v3.19c0 .31.21.66.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
                    </svg>
                    <span>Continue with GitHub</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProviderSignIn('passkey')}
                    disabled={submittingProvider !== null}
                    className="w-full h-10 rounded-lg border border-[#2A2E39] hover:border-[#525766] bg-[#0B0D12] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#9598A1]" />
                    <span>Continue with Passkey</span>
                  </button>
                </div>
              )}

              {/* Subtle Horizontal "or" Divider */}
              <div className="flex items-center gap-3 my-5">
                <span className="h-px flex-1 bg-[#262932]" />
                <span className="text-xs text-[#787B86]">or</span>
                <span className="h-px flex-1 bg-[#262932]" />
              </div>

              {/* Outlined Dark Email CTA */}
              <button
                type="button"
                onClick={() => {
                  setServerError('');
                  setFieldErrors({});
                  setEmailFormOpen(true);
                }}
                className="w-full h-11 rounded-lg border border-[#363A45] hover:border-[#6A6E7A] bg-transparent text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4 text-[#D1D4DC]" />
                <span>Email</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setEmailFormOpen(false);
                  setServerError('');
                  setFieldErrors({});
                }}
                className="text-xs font-medium text-[#4E8EFF] hover:text-[#78A9FF] transition-colors cursor-pointer"
              >
                &larr; Back to sign-in options
              </button>

              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="financia-auth-name"
                    className="block text-xs font-medium text-[#B2B5BE] mb-1.5"
                  >
                    Full name (optional)
                  </label>
                  <input
                    id="financia-auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="w-full h-10 px-3 rounded-lg bg-[#0F1218] border border-[#2A2E39] focus:border-[#2962FF] text-sm text-white placeholder-[#5D606B] focus:outline-none"
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-[#F23645] mt-1">{fieldErrors.name}</p>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="financia-auth-email"
                  className="block text-xs font-medium text-[#B2B5BE] mb-1.5"
                >
                  Email
                </label>
                <input
                  id="financia-auth-email"
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full h-10 px-3 rounded-lg bg-[#0F1218] border border-[#2A2E39] focus:border-[#2962FF] text-sm text-white placeholder-[#5D606B] focus:outline-none"
                />
                {fieldErrors.email && (
                  <p className="text-xs text-[#F23645] mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="financia-auth-password"
                  className="block text-xs font-medium text-[#B2B5BE] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="financia-auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full h-10 pl-3 pr-10 rounded-lg bg-[#0F1218] border border-[#2A2E39] focus:border-[#2962FF] text-sm text-white placeholder-[#5D606B] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#787B86] hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-[#F23645] mt-1">{fieldErrors.password}</p>
                )}

                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex-1 grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={`h-1 rounded-full ${
                            strength.score >= step
                              ? strength.score <= 1
                                ? 'bg-[#F23645]'
                                : strength.score === 2
                                ? 'bg-[#D97706]'
                                : strength.score === 3
                                ? 'bg-[#2962FF]'
                                : 'bg-[#089981]'
                              : 'bg-[#262932]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-[#9598A1] tabular-nums">
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingProvider === 'email'}
                className="w-full h-11 rounded-lg bg-[#2962FF] hover:bg-[#1E53E5] text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {submittingProvider === 'email'
                  ? mode === 'signup'
                    ? 'Creating account...'
                    : 'Logging in...'
                  : mode === 'signup'
                  ? 'Create free account'
                  : 'Log in'}
              </button>
            </form>
          )}
        </div>

        {/* Bottom Hairline Footer Mode Switch */}
        <div className="border-t border-[#1E222D] pt-5 pb-1 text-center text-sm text-[#B2B5BE] shrink-0">
          {mode === 'signup' ? (
            <>
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={handleToggleMode}
                className="text-[#4E8EFF] hover:text-[#78A9FF] font-medium cursor-pointer"
              >
                Log in
              </button>
            </>
          ) : (
            <>
              <span>Don&apos;t have an account? </span>
              <button
                type="button"
                onClick={handleToggleMode}
                className="text-[#4E8EFF] hover:text-[#78A9FF] font-medium cursor-pointer"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
