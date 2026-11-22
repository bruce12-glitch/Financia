import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Database,
  FileUp,
  Layers,
  LayoutGrid,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  TerminalSquare,
  X,
} from 'lucide-react';
import { FinanciaLogo } from './components/FinanciaLogo';
import { FundTerminal } from './components/FundTerminal';
import { OverviewCatalogView } from './components/OverviewCatalogView';
import { SchemeUniverseView } from './components/SchemeUniverseView';
import { PortfolioHoldingsView } from './components/PortfolioHoldingsView';
import { AmfiIngestView } from './components/AmfiIngestView';
import { DataQualityView } from './components/DataQualityView';
import { SqlWorkbenchView } from './components/SqlWorkbenchView';
import { OverviewResponse } from './types/db';

type NavSectionId = 'terminal' | 'overview' | 'schemes' | 'holdings' | 'amfi' | 'quality' | 'sql';

const NAV_ITEMS: Array<{
  id: NavSectionId;
  label: string;
  breadcrumb: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'terminal', label: 'Fund Terminal', breadcrumb: 'Fund Terminal (ETFs & MFs)', icon: Search },
  { id: 'overview', label: 'Overview & Catalog', breadcrumb: 'Overview & Catalog', icon: LayoutGrid },
  { id: 'schemes', label: 'Scheme Universe', breadcrumb: 'Scheme Universe & TER', icon: Database },
  { id: 'holdings', label: 'Portfolio Holdings', breadcrumb: 'Portfolio Holdings & ISINs', icon: Layers },
  { id: 'amfi', label: 'AMFI NAV Ingest', breadcrumb: 'AMFI Feed Ingest', icon: FileUp },
  { id: 'quality', label: 'Data Quality Audit', breadcrumb: 'Data Quality Audit', icon: ShieldCheck },
  { id: 'sql', label: 'SQL Workbench', breadcrumb: 'SQL Workbench', icon: TerminalSquare },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavSectionId>('terminal');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/db/overview');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: OverviewResponse = await res.json();
      setOverview(data);
      setBannerError(null);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Unable to reach Financia database API');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Poll gently while initial background warmup syncs empty tables on first boot
  useEffect(() => {
    if (!overview) return;
    const anyPendingOrSyncing = overview.datasets.some(
      (d) => d.ingestionMode === 'sqlite' && (d.syncStatus === 'syncing' || d.syncStatus === 'pending')
    );
    if (!anyPendingOrSyncing) return;
    const timer = setTimeout(() => {
      fetchOverview();
    }, 2500);
    return () => clearTimeout(timer);
  }, [overview, fetchOverview]);

  const handleSyncAll = async () => {
    setSyncingAll(true);
    setBannerError(null);
    try {
      const res = await fetch('/api/db/sync-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk sync failed');
      if (data.overview) setOverview(data.overview);
      else await fetchOverview();
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Bulk sync failed');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncDataset = async (datasetId: string) => {
    setBannerError(null);
    const res = await fetch(`/api/db/sync/${encodeURIComponent(datasetId)}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setBannerError(data.error || `Failed to sync ${datasetId}`);
    }
    if (data.overview) setOverview(data.overview);
    else await fetchOverview();
  };

  const handleProbeParquet = async (datasetId: string) => {
    setBannerError(null);
    const res = await fetch(`/api/db/probe-parquet/${encodeURIComponent(datasetId)}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      setBannerError(data.error || `Failed to probe Parquet range for ${datasetId}`);
      return;
    }
    await fetchOverview();
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#090e1a] flex">
      {/* Desktop Left Sidebar (248px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[248px] lg:shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="h-14 px-5 flex items-center border-b border-slate-200">
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="inline-flex items-center whitespace-nowrap shrink-0"
          >
            <FinanciaLogo size="sm" />
          </a>
        </div>

        <nav aria-label="Database Workspace Navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-100 text-[#090e1a]'
                    : 'text-slate-600 hover:text-[#090e1a] hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#2563eb]' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
          <div className="font-medium text-slate-700">Financia Repository Target</div>
          <a
            href="https://github.com/bruce12-glitch/Financia"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[#2563eb] hover:underline block truncate"
          >
            bruce12-glitch/Financia
          </a>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-900/40 flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-64 bg-white h-full border-r border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <FinanciaLogo size="sm" />
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-[#090e1a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav aria-label="Mobile Navigation" className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium ${
                      active ? 'bg-slate-100 text-[#090e1a]' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#2563eb]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Single-Row Top Bar (Breadcrumb left, 1 Primary CTA right) */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-[#090e1a] rounded-md hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="hidden sm:inline font-medium text-slate-700 whitespace-nowrap">Database Engine</span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-[#090e1a] truncate">{currentNav.breadcrumb}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={syncingAll}
              onClick={handleSyncAll}
              className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 text-xs font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-md transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
              <span className="sm:hidden">{syncingAll ? 'Syncing…' : 'Sync'}</span>
              <span className="hidden sm:inline">{syncingAll ? 'Syncing MFPRO…' : 'Sync Live Datasets'}</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1360px] w-full mx-auto">
          {bannerError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bannerError}</span>
              </span>
              <button
                type="button"
                onClick={() => setBannerError(null)}
                className="text-red-700 hover:underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeTab === 'terminal' && <FundTerminal onDatabaseChanged={fetchOverview} />}
          {activeTab === 'overview' && (
            <OverviewCatalogView
              overview={overview}
              loading={loadingOverview}
              syncingAll={syncingAll}
              onSyncDataset={handleSyncDataset}
              onProbeParquet={handleProbeParquet}
              onNavigateTab={(tab) => setActiveTab(tab as NavSectionId)}
            />
          )}
          {activeTab === 'schemes' && <SchemeUniverseView />}
          {activeTab === 'holdings' && <PortfolioHoldingsView />}
          {activeTab === 'amfi' && <AmfiIngestView onDatabaseChanged={fetchOverview} />}
          {activeTab === 'quality' && <DataQualityView />}
          {activeTab === 'sql' && <SqlWorkbenchView />}
        </main>
      </div>
    </div>
  );
}
