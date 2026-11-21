import crypto from 'crypto';
import { anonymizeClientIp } from '../middleware/securityMiddleware.ts';

export type AuditEventType =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.register'
  | 'auth.logout'
  | 'alerts.create'
  | 'alerts.delete'
  | 'watchlist.update'
  | 'screener.compare'
  | 'security.rate_limited';

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  event: AuditEventType;
  userId: string | null;
  maskedIp: string;
  detail: string;
  severity: 'info' | 'warning';
}

const MAX_AUDIT_ENTRIES = 300;

export class AuditLogService {
  private entries: SecurityAuditEntry[] = [];

  record(input: {
    event: AuditEventType;
    userId?: string | null;
    rawIp?: string;
    detail: string;
    severity?: 'info' | 'warning';
  }): SecurityAuditEntry {
    const entry: SecurityAuditEntry = {
      id: `aud_${crypto.randomUUID().slice(0, 10)}`,
      timestamp: new Date().toISOString(),
      event: input.event,
      userId: input.userId ?? null,
      maskedIp: anonymizeClientIp(input.rawIp),
      detail: input.detail.slice(0, 180),
      severity: input.severity ?? (input.event === 'auth.login.failed' || input.event === 'security.rate_limited' ? 'warning' : 'info'),
    };
    this.entries.unshift(entry);
    if (this.entries.length > MAX_AUDIT_ENTRIES) {
      this.entries.length = MAX_AUDIT_ENTRIES;
    }
    return entry;
  }

  listForUser(userId: string, limit = 20): SecurityAuditEntry[] {
    const safeLimit = Math.max(1, Math.min(50, limit));
    return this.entries.filter((e) => e.userId === userId).slice(0, safeLimit);
  }
}

export const securityAuditLog = new AuditLogService();
