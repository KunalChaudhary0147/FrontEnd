import { useEffect, useState } from 'react';
import { Activity, Bell, History, LayoutDashboard, ScanSearch, SlidersHorizontal, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const PAGES = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'ingestion', label: 'Data Ingestion', icon: Upload },
  { id: 'telemetry', label: 'Telemetry', icon: Activity },
  { id: 'historical', label: 'Historical Analysis', icon: History },
  { id: 'detection', label: 'Anomaly Detection', icon: ScanSearch },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'configuration', label: 'Configuration', icon: SlidersHorizontal },
] satisfies { id: string; label: string; icon: LucideIcon }[];

export type PageId = (typeof PAGES)[number]['id'];

const DEFAULT_PAGE: PageId = 'overview';

function pageFromHash(hash: string): PageId {
  const id = hash.replace(/^#\/?/, '');
  const match = PAGES.find((page) => page.id === id);
  return match ? match.id : DEFAULT_PAGE;
}

export function useCurrentPage(): PageId {
  const [page, setPage] = useState<PageId>(() => pageFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return page;
}

export function navigateTo(page: PageId) {
  window.location.hash = `/${page}`;
}

export function pageLabel(page: PageId) {
  return PAGES.find((item) => item.id === page)?.label ?? 'Overview';
}
