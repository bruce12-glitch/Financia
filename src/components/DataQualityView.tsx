import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  AumQualityNoteRow,
  DataQualityIssueRow,
  formatNumber,
} from '../types/db';

export const DataQualityView: React.FC = () => {
  const [tab, setTab] = useState<'scheme_conflicts' | 'aum_anomalies'>('scheme_conflicts');
  const [status, setStatus] = useState('ALL');
  const [code, setCode] = useState('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<Array<DataQualityIssueRow | AumQualityNoteRow>>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Array<{ status: string; count: number }>>([]);
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const pageSize = 40;

  const fetchQuality = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({
        tab,
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (tab === 'scheme_conflicts' && status !== 'ALL') sp.set('status', status);
      if (code !== 'ALL') sp.set('code', code);
      if (q.trim()) sp.set('q', q.trim());

      const res = await fetch(`/api/db/quality?${sp.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setSummary(data.summary || []);
      setCodes(data.codes || []);
    } finally {
      setLoading(false);
    }
  }, [tab, status, code, q, page]);

  useEffect(() => {
    fetchQuality();
  }, [fetchQuality]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#090e1a]">
            Data Quality & AUM Anomaly Audit
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Inspect unmatched AMFI vs Scheme Document metadata conflicts (<span className="font-mono text-xs text-slate-800">data_quality_issues</span>) and corrected daily AUM print anomalies (<span className="font-mono text-xs text-slate-800">fund_aum_quality_notes</span>).
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setTab('scheme_conflicts'); setStatus('ALL'); setCode('ALL'); setPage(0); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'scheme_conflicts'
                ? 'bg-white text-[#090e1a] shadow-xs'
                : 'text-slate-600 hover:text-[#090e1a]'
            }`}
          >
            Scheme Conflicts
          </button>
          <button
            type="button"
            onClick={() => { setTab('aum_anomalies'); setStatus('ALL'); setCode('ALL'); setPage(0); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'aum_anomalies'
                ? 'bg-white text-[#090e1a] shadow-xs'
                : 'text-slate-600 hover:text-[#090e1a]'
            }`}
          >
            Daily AUM Anomalies
          </button>
        </div>
      </div>

      {/* Summary Distribution Bar */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summary.slice(0, 4).map((item) => (
            <div key={item.status || 'other'} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-mono text-slate-500 truncate">{item.status || 'unclassified'}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-[#090e1a] tabular-nums">
                {formatNumber(item.count)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Search data quality records"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search fund name, issue detail, or SSD fund ID…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
          />
        </div>

        {tab === 'scheme_conflicts' && (
          <select
            aria-label="Filter by audit status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="sm:w-44 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
          >
            <option value="ALL">All Statuses</option>
            {summary.map((s) => (
              <option key={s.status} value={s.status}>{s.status} ({s.count})</option>
            ))}
          </select>
        )}

        <select
          aria-label="Filter by issue or quality code"
          value={code}
          onChange={(e) => { setCode(e.target.value); setPage(0); }}
          className="sm:w-64 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
        >
          <option value="ALL">All Codes ({codes.length})</option>
          {codes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'scheme_conflicts' ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Fund / Scheme</th>
                  <th className="py-2.5 px-4">Issue Code & Status</th>
                  <th className="py-2.5 px-4">Conflict Detail</th>
                  <th className="py-2.5 px-4 text-right">As Of</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="py-8 px-4 text-center text-slate-500">Loading conflicts…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 px-4 text-center text-slate-500">No conflicts match this filter.</td></tr>
                ) : (
                  (rows as DataQualityIssueRow[]).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-[#090e1a]">{item.name || '—'}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.category || '—'} {item.scheme_code ? `· Code ${item.scheme_code}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-slate-800">{item.issue_code || '—'}</div>
                        <div
                          className={`text-[11px] font-medium ${
                            item.status === 'conflict'
                              ? 'text-red-600'
                              : item.status === 'review'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {item.status || '—'} · {item.source || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-lg text-slate-700 leading-relaxed">
                        {item.detail || item.issue || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                        {item.as_of || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">SSD Fund ID</th>
                  <th className="py-2.5 px-4">AMFI Fund Name</th>
                  <th className="py-2.5 px-4">Report Date</th>
                  <th className="py-2.5 px-4 text-right">As Filed (Cr)</th>
                  <th className="py-2.5 px-4 text-right">Published (Cr)</th>
                  <th className="py-2.5 px-4">Quality Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="py-8 px-4 text-center text-slate-500">Loading AUM anomalies…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 px-4 text-center text-slate-500">No AUM anomalies match this filter.</td></tr>
                ) : (
                  (rows as AumQualityNoteRow[]).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {item.amfi_ssd_fund_id || '—'}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#090e1a]">{item.amfi_fund_name || '—'}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">{item.report_date || '—'}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {item.aum_cr_as_filed !== null ? formatNumber(item.aum_cr_as_filed, 2) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-[#090e1a] whitespace-nowrap">
                        {item.aum_cr !== null ? formatNumber(item.aum_cr, 2) : 'Suppressed'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-amber-800 whitespace-nowrap">
                        {item.quality_code || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <div className="font-mono tabular-nums">
            Page {page + 1} of {totalPages} · {formatNumber(total)} records
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 bg-white rounded-md hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 bg-white rounded-md hover:bg-slate-50 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
