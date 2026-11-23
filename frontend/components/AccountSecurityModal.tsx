import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  event: string;
  maskedIp: string;
  detail: string;
  severity: 'info' | 'warning';
}

interface SecurityAuditPayload {
  user: { id: string; email: string; name: string };
  protections: Record<string, string>;
  events: AuditEntry[];
}

interface AccountSecurityModalProps {
  open: boolean;
  token: string | null;
  onClose: () => void;
}

export const AccountSecurityModal: React.FC<AccountSecurityModalProps> = ({
  open,
  token,
  onClose,
}) => {
  const [data, setData] = useState<SecurityAuditPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/security/audit', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load account security activity.');
        return (await res.json()) as SecurityAuditPayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Request failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, token]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account Security & Audit Activity"
      data-testid="account-security-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-[640px] rounded-[14px] bg-white border border-[#e5e9f0] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e5e9f0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[8px] bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-[16px] font-display font-bold text-[#0f172a]">
                Account Security &amp; Session Audit
              </h3>
              <p className="text-[12px] text-[#64748b]">
                Active FinTech transport protections and recent authenticated workspace events
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account security dialog"
            className="p-1.5 rounded-[8px] text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
          {loading && (
            <div className="text-[13px] text-[#64748b] py-6 text-center">
              Loading verified security posture...
            </div>
          )}
          {error && (
            <div className="rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] p-3 text-[12.5px] text-[#be123c]">
              {error}
            </div>
          )}

          {data && (
            <>
              <div className="rounded-[10px] border border-[#e5e9f0] bg-[#fbfcfe] p-4 space-y-2.5">
                <div className="text-[12px] font-semibold text-[#0f172a] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#059669]" />
                  Active Server Safeguards
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[12px]">
                  {Object.entries(data.protections).map(([key, desc]) => {
                    const labels: Record<string, string> = {
                      passwordHashing: 'Password Hashing',
                      sessionSigning: 'Session Signing',
                      rateLimiting: 'Rate Limiting',
                      csrfDefense: 'CSRF Defense',
                      transportHeaders: 'Transport Headers',
                      payloadAudit: 'Payload & Audit Trail',
                    };
                    const title = labels[key] || key.replace(/([A-Z])/g, ' $1').trim();
                    return (
                      <div key={key} className="rounded-[7px] bg-white border border-[#eef2f6] p-2.5">
                        <div className="font-semibold text-[#0f172a]">{title}</div>
                        <div className="text-[11px] text-[#64748b] mt-0.5 leading-snug">{desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[12.5px] font-semibold text-[#0f172a] mb-2">
                  Recent Authenticated Activity ({data.events.length})
                </div>
                {data.events.length === 0 ? (
                  <div className="text-[12px] text-[#64748b] py-4 border border-[#e5e9f0] rounded-[8px] text-center">
                    No security events recorded in this session yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#f1f5f9] border border-[#e5e9f0] rounded-[10px] overflow-hidden max-h-56 overflow-y-auto">
                    {data.events.map((ev) => (
                      <div key={ev.id} className="px-3.5 py-2.5 flex items-start justify-between gap-3 text-[12px] bg-white">
                        <div>
                          <div className="font-semibold text-[#0f172a]">{ev.detail}</div>
                          <div className="text-[11px] font-mono text-[#64748b] mt-0.5">
                            {ev.event} · IP {ev.maskedIp}
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-[#64748b] whitespace-nowrap shrink-0 tabular-nums">
                          {new Date(ev.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
