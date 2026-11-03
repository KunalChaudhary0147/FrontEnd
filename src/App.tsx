import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from '@/components/ui/toaster';
import { ActiveConfigProvider } from '@/hooks/use-active-config';
import { AlertsPage } from '@/pages/alerts-page';
import { ConfigurationPage } from '@/pages/configuration-page';
import { DetectionPage } from '@/pages/detection-page';
import { HistoricalPage } from '@/pages/historical-page';
import { IngestionPage } from '@/pages/ingestion-page';
import { OverviewPage } from '@/pages/overview-page';
import { TelemetryPage } from '@/pages/telemetry-page';
import type { PageId } from '@/lib/navigation';

function App() {
  return (
    <ActiveConfigProvider>
      <AppShell>
        {(page: PageId) => {
          switch (page) {
            case 'overview':
              return <OverviewPage />;
            case 'ingestion':
              return <IngestionPage />;
            case 'telemetry':
              return <TelemetryPage />;
            case 'historical':
              return <HistoricalPage />;
            case 'detection':
              return <DetectionPage />;
            case 'alerts':
              return <AlertsPage />;
            case 'configuration':
              return <ConfigurationPage />;
            default:
              return null;
          }
        }}
      </AppShell>
      <Toaster />
    </ActiveConfigProvider>
  );
}

export default App;
