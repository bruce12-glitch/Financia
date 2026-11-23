import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, Eye, EyeOff, KeyRound, Mail, X } from 'lucide-react';
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
      className="fixed inset-0 z-50 bg-[#f6f9fc] text-[#0d253d] flex flex-col lg:grid lg:grid-cols-2 p-3 gap-3 overflow-y-auto lg:overflow-hidden"
    >
      {/* Left Split Pane: Signature Astronaut & 3D Sunlit Misty Meadow (AlpineAuthCanvas) */}
      <div className="hidden lg:block h-full min-h-0 rounded-[12px] overflow-hidden shadow-level-2">
        <AlpineAuthCanvas />
      </div>

      {/* Right Split Pane: Crisp White Surface Authentication Panel */}
      <div className="flex-1 flex flex-col justify-between bg-white border border-[#e3e8ee] rounded-[12px] shadow-level-1 px-6 sm:px-10 py-6 min-h-full lg:overflow-y-auto">
        {/* Top Row: Centered Brand Wordmark + Close Button */}
        <div className="relative flex items-center justify-center shrink-0 min-h-[36px]">
          <FinanciaLogo variant="dark" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication page"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full text-[#64748d] hover:text-[#0d253d] hover:bg-[#f6f9fc] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Compact Astronaut Meadow Banner */}
        <div className="lg:hidden mt-4 shrink-0">
          <AlpineAuthCanvas compact />
        </div>

        {/* Centered Auth Card Column */}
        <div className="w-full max-w-[380px] mx-auto my-auto py-8 sm:py-10">
          <h1 className="type-display-lg text-[#0d253d] text-center mb-2">
            {mode === 'signup' ? 'Create your Financia account' : 'Sign in to Financia'}
          </h1>
          <p className="text-[14px] font-light text-[#64748d] text-center mb-7">
            {mode === 'signup'
              ? 'Access live AMFI NAVs, spot gold, Treasury yields & saved alerts.'
              : 'Welcome back to your Financia market workspace.'}
          </p>

          {serverError && (
            <div
              role="alert"
              className="mb-4 px-3.5 py-2.5 rounded-[6px] bg-[#ea2261]/8 border border-[#ea2261]/30 text-[13px] font-normal text-[#ea2261] leading-relaxed"
            >
              {serverError}
            </div>
          )}

          {!emailFormOpen ? (
            <div>
              {/* Primary Google Sign-In CTA */}
              <button
                type="button"
                onClick={() => handleProviderSignIn('google')}
                disabled={submittingProvider !== null}
                className="w-full min-h-[44px] px-4 rounded-full bg-[#1c1e54] hover:bg-[#2e2b8c] text-white font-normal text-[14px] flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
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
                  className="text-[13px] font-normal text-[#533afd] hover:text-[#4434d4] inline-flex items-center gap-1 transition-colors cursor-pointer"
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
                    className="w-full min-h-[40px] rounded-full border border-[#e3e8ee] hover:border-[#a8c3de] bg-[#f6f9fc] text-[#0d253d] text-[13px] font-normal flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
                    className="w-full min-h-[40px] rounded-full border border-[#e3e8ee] hover:border-[#a8c3de] bg-[#f6f9fc] text-[#0d253d] text-[13px] font-normal flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
                    className="w-full min-h-[40px] rounded-full border border-[#e3e8ee] hover:border-[#a8c3de] bg-[#f6f9fc] text-[#0d253d] text-[13px] font-normal flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#533afd]" />
                    <span>Continue with Passkey</span>
                  </button>
                </div>
              )}

              {/* Subtle Horizontal "or" Divider */}
              <div className="flex items-center gap-3 my-5">
                <span className="h-px flex-1 bg-[#e3e8ee]" />
                <span className="text-[12px] text-[#64748d]">or</span>
                <span className="h-px flex-1 bg-[#e3e8ee]" />
              </div>

              {/* Secondary Pill Email CTA */}
              <button
                type="button"
                onClick={() => {
                  setServerError('');
                  setFieldErrors({});
                  setEmailFormOpen(true);
                }}
                className="btn-secondary-pill w-full min-h-[44px] text-[14px] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Continue with Email</span>
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
                className="text-[13px] font-normal text-[#533afd] hover:text-[#4434d4] transition-colors cursor-pointer"
              >
                &larr; Back to sign-in options
              </button>

              {mode === 'signup' && (
                <div>
                  <label
                    htmlFor="financia-auth-name"
                    className="block text-[13px] font-normal text-[#273951] mb-1.5"
                  >
                    Full name (optional)
                  </label>
                  <input
                    id="financia-auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="text-input-stripe w-full min-h-[42px]"
                  />
                  {fieldErrors.name && (
                    <p className="text-[12px] text-[#ea2261] mt-1">{fieldErrors.name}</p>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="financia-auth-email"
                  className="block text-[13px] font-normal text-[#273951] mb-1.5"
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
                  className="text-input-stripe w-full min-h-[42px]"
                />
                {fieldErrors.email && (
                  <p className="text-[12px] text-[#ea2261] mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="financia-auth-password"
                  className="block text-[13px] font-normal text-[#273951] mb-1.5"
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
                    className="text-input-stripe w-full min-h-[42px] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#64748d] hover:text-[#0d253d] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[12px] text-[#ea2261] mt-1">{fieldErrors.password}</p>
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
                                ? 'bg-[#ea2261]'
                                : strength.score === 2
                                ? 'bg-[#9b6829]'
                                : strength.score === 3
                                ? 'bg-[#533afd]'
                                : 'bg-[#0c7a5f]'
                              : 'bg-[#e3e8ee]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-[#64748d] tabular-nums">
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingProvider === 'email'}
                className="btn-primary-pill w-full min-h-[44px] text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <span>
                  {submittingProvider === 'email'
                    ? mode === 'signup'
                      ? 'Creating account...'
                      : 'Logging in...'
                    : mode === 'signup'
                    ? 'Create free account'
                    : 'Log in'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Bottom Hairline Footer Mode Switch */}
        <div className="border-t border-[#e3e8ee] pt-5 pb-1 text-center text-[14px] font-light text-[#64748d] shrink-0">
          {mode === 'signup' ? (
            <>
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={handleToggleMode}
                className="text-[#533afd] hover:text-[#4434d4] font-normal cursor-pointer"
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
                className="text-[#533afd] hover:text-[#4434d4] font-normal cursor-pointer"
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
