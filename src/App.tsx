import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from '@/components/ui/toaster';
import { ActiveConfigProvider } from '@/hooks/use-active-config';
import { ActiveDatasetProvider } from '@/hooks/use-active-datasets';
import { AlertsPage } from '@/pages/alerts-page';
import { ConfigurationPage } from '@/pages/configuration-page';
import { DatasetManagerPage } from '@/pages/dataset-manager-page';
import { DetectionPage } from '@/pages/detection-page';
import { HistoricalPage } from '@/pages/historical-page';
import { IngestionPage } from '@/pages/ingestion-page';
import { OverviewPage } from '@/pages/overview-page';
import { TelemetryPage } from '@/pages/telemetry-page';
import type { PageId } from '@/lib/navigation';
import { ErrorBoundary } from '@/components/common/error-boundary';

function App() {
  return (
    <ActiveConfigProvider>
      <ActiveDatasetProvider>
        <AppShell>
          {(page: PageId) => (
            <ErrorBoundary key={page}>
              {page === 'overview' && <OverviewPage />}
              {page === 'ingestion' && <IngestionPage />}
              {page === 'datasets' && <DatasetManagerPage />}
              {page === 'telemetry' && <TelemetryPage />}
              {page === 'historical' && <HistoricalPage />}
              {page === 'detection' && <DetectionPage />}
              {page === 'alerts' && <AlertsPage />}
              {page === 'configuration' && <ConfigurationPage />}
            </ErrorBoundary>
          )}
        </AppShell>
        <Toaster />
      </ActiveDatasetProvider>
    </ActiveConfigProvider>
  );
}

export default App;
