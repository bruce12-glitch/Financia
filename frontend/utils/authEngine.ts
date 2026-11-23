export type AuthMode = 'signup' | 'login';

export type AuthProvider = 'google' | 'apple' | 'github' | 'passkey' | 'email';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider: AuthProvider;
  initials: string;
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

export interface AuthValidationResult {
  valid: boolean;
  fieldErrors: {
    name?: string;
    email?: string;
    password?: string;
  };
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too short' | 'Weak' | 'Fair' | 'Strong';
}

export const AUTH_STORAGE_KEY = 'financia_auth_session_v1';

export function normalizeEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase();
}

export function isValidEmail(rawEmail: string): boolean {
  const email = normalizeEmail(rawEmail);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function deriveDisplayNameAndInitials(
  preferredName: string | undefined,
  email: string
): { displayName: string; initials: string } {
  const trimmedName = (preferredName || '').trim();
  const baseSource =
    trimmedName.length > 0
      ? trimmedName
      : normalizeEmail(email)
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .trim();

  const words = baseSource
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  const displayName = words.length > 0 ? words.join(' ') : 'Financia Investor';

  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
      : displayName.slice(0, 2).toUpperCase();

  return { displayName, initials };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (password.length < 8) {
    return { score: password.length === 0 ? 0 : 1, label: 'Too short' };
  }

  let complexity = 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) complexity += 1;
  if (/\d/.test(password)) complexity += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) complexity += 1;

  const clamped = Math.min(4, Math.max(1, complexity)) as 1 | 2 | 3 | 4;
  if (clamped <= 2) {
    return { score: 2, label: 'Weak' };
  }
  if (clamped === 3) {
    return { score: 3, label: 'Fair' };
  }
  return { score: 4, label: 'Strong' };
}

export function validateAuthCredentials(input: {
  mode: AuthMode;
  email: string;
  password: string;
  name?: string;
}): AuthValidationResult {
  const fieldErrors: AuthValidationResult['fieldErrors'] = {};

  if (!isValidEmail(input.email)) {
    fieldErrors.email = 'Enter a valid email address (e.g. name@domain.com).';
  }

  if (!input.password || input.password.length < 8) {
    fieldErrors.password =
      input.mode === 'signup'
        ? 'Password must be at least 8 characters.'
        : 'Enter your password (minimum 8 characters).';
  }

  if (input.mode === 'signup' && input.name !== undefined && input.name.trim().length > 60) {
    fieldErrors.name = 'Name must be 60 characters or fewer.';
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

export function loadStoredAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      parsed &&
      typeof parsed.token === 'string' &&
      parsed.token.length > 0 &&
      parsed.user &&
      typeof parsed.user.email === 'string' &&
      typeof parsed.user.name === 'string'
    ) {
      return parsed as AuthSession;
    }
  } catch {
    // Ignore storage read failures
  }
  return null;
}

export function persistAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore quota errors
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage clear failures
  }
}
