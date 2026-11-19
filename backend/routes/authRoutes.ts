import { Router } from 'express';
import crypto from 'crypto';
import {
  AuthProvider,
  AuthUser,
  deriveDisplayNameAndInitials,
  normalizeEmail,
  validateAuthCredentials,
} from '../../frontend/utils/authEngine.ts';
import {
  ensureDemoInvestorAccount,
  extractBearerOrCookieToken,
  hashPassword,
  revokedTokens,
  signAuthToken,
  verifyAuthToken,
  verifyPassword,
} from '../services/authService.ts';
import { financiaStore, PersistenceStore } from '../services/persistenceService.ts';

export function createAuthRouter(store: PersistenceStore = financiaStore): Router {
  const router = Router();
  ensureDemoInvestorAccount(store);

  router.post('/register', (req, res) => {
    const body = (req.body || {}) as {
      email?: string;
      password?: string;
      name?: string;
    };
    const email = normalizeEmail(String(body.email || ''));
    const password = String(body.password || '');
    const preferredName = typeof body.name === 'string' ? body.name.trim() : '';

    const validation = validateAuthCredentials({
      mode: 'signup',
      email,
      password,
      name: preferredName,
    });
    if (!validation.valid) {
      const firstError =
        validation.fieldErrors.email ||
        validation.fieldErrors.password ||
        validation.fieldErrors.name ||
        'Invalid account details.';
      res.status(400).json({ error: firstError, fieldErrors: validation.fieldErrors });
      return;
    }

    if (store.hasAccount(email)) {
      res.status(409).json({
        error: 'An account with this email already exists. Please log in instead.',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const { displayName, initials } = deriveDisplayNameAndInitials(preferredName, email);
    const user: AuthUser = {
      id: `usr_${crypto.randomUUID().slice(0, 12)}`,
      name: displayName,
      email,
      provider: 'email',
      initials,
      createdAt: new Date().toISOString(),
    };

    store.setAccount(email, {
      user,
      salt,
      passwordHash: hashPassword(password, salt),
    });

    const token = signAuthToken(user);
    res.cookie('financia_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ user, token });
  });

  router.post('/login', (req, res) => {
    const body = (req.body || {}) as { email?: string; password?: string };
    const email = normalizeEmail(String(body.email || ''));
    const password = String(body.password || '');

    const validation = validateAuthCredentials({
      mode: 'login',
      email,
      password,
    });
    if (!validation.valid) {
      const firstError =
        validation.fieldErrors.email ||
        validation.fieldErrors.password ||
        'Please enter your email and password.';
      res.status(400).json({ error: firstError, fieldErrors: validation.fieldErrors });
      return;
    }

    const record = store.getAccount(email);
    if (!record || !verifyPassword(password, record.salt, record.passwordHash)) {
      res.status(401).json({
        error: 'Invalid email or password. Try demo@financia.io / DemoPass2026! or sign up.',
      });
      return;
    }

    const token = signAuthToken(record.user);
    res.cookie('financia_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user: record.user, token });
  });

  router.post('/oauth', (req, res) => {
    const body = (req.body || {}) as {
      provider?: AuthProvider;
      email?: string;
      name?: string;
    };
    const allowedProviders: AuthProvider[] = ['google', 'apple', 'github', 'passkey'];
    const provider: AuthProvider =
      body.provider && allowedProviders.includes(body.provider) ? body.provider : 'google';

    const defaultProfiles: Record<Exclude<AuthProvider, 'email'>, { email: string; name: string }> = {
      google: { email: 'subashree04116@gmail.com', name: 'Subashree Investor' },
      apple: { email: 'investor@icloud.financia.io', name: 'Financia Apple User' },
      github: { email: 'quant@github.financia.io', name: 'Quant Developer' },
      passkey: { email: 'passkey@financia.io', name: 'Verified Passkey' },
    };

    const chosen = defaultProfiles[provider as Exclude<AuthProvider, 'email'>];
    const email = normalizeEmail(body.email || chosen.email);
    const preferredName = (body.name || chosen.name).trim();
    const existing = store.getAccount(email);

    let user: AuthUser;
    if (existing) {
      user = existing.user;
    } else {
      const { displayName, initials } = deriveDisplayNameAndInitials(preferredName, email);
      user = {
        id: `usr_${provider}_${crypto.randomUUID().slice(0, 8)}`,
        name: displayName,
        email,
        provider,
        initials,
        createdAt: new Date().toISOString(),
      };
      store.setAccount(email, {
        user,
        salt: crypto.randomBytes(16).toString('hex'),
        passwordHash: '',
      });
    }

    const token = signAuthToken(user);
    res.cookie('financia_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user, token });
  });

  router.get('/me', (req, res) => {
    const token = extractBearerOrCookieToken(req);
    const user = token ? verifyAuthToken(token) : null;
    if (!user) {
      res.json({ authenticated: false, user: null });
      return;
    }
    res.json({ authenticated: true, user });
  });

  router.post('/logout', (req, res) => {
    const token = extractBearerOrCookieToken(req);
    if (token) {
      revokedTokens.add(token);
    }
    res.clearCookie('financia_session', { path: '/' });
    res.json({ ok: true });
  });

  return router;
}
