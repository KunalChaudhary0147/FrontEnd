import type { ReactNode } from 'react';
import { Activity, Bell, Database, Gauge, Siren, Waypoints } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Panel, PageHeader } from '@/components/common/page-layout';
import { SeverityBadge } from '@/components/common/severity-badge';
import { StatCard } from '@/components/common/stat-card';
import { QueryContent } from '@/components/common/state-panels';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBackendQuery, type BackendQueryState } from '@/hooks/use-backend-query';
import { CHART_AXIS_TICK, CHART_COLORS, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '@/lib/chart-theme';
import { formatDateTime, formatDayLabel, formatNumber } from '@/lib/format';
import { SEVERITY_STYLES } from '@/lib/severity';
import type { OverviewData } from '@/types/domain';

const AXIS_PROPS = { tick: CHART_AXIS_TICK, axisLine: false, tickLine: false } as const;

function ChartPanel({
  title,
  description,
  state,
  onRetry,
  children,
}: {
  title: string;
  description: string;
  state: BackendQueryState<OverviewData>;
  onRetry: () => void;
  children: (data: OverviewData) => ReactNode;
}) {
  return (
    <Panel title={title} description={description}>
      <QueryContent state={state} onRetry={onRetry}>
        {children}
      </QueryContent>
    </Panel>
  );
}

function statValue(state: BackendQueryState<OverviewData>, pick: (data: OverviewData) => number): string | null {
  switch (state.status) {
    case 'ready':
      return formatNumber(pick(state.data));
    case 'loading':
      return '…';
    case 'error':
      return '—';
    case 'disconnected':
      return null;
  }
}

export function OverviewPage() {
  const { state, refetch } = useBackendQuery<OverviewData>('/overview');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="A snapshot of telemetry volume, detected anomalies, and the alerts that need attention."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Telemetry records" value={statValue(state, (d) => d.totals.telemetry_records)} icon={Database} />
        <StatCard label="Total anomalies" value={statValue(state, (d) => d.totals.anomalies)} icon={Activity} />
        <StatCard label="Active alerts" value={statValue(state, (d) => d.totals.active_alerts)} icon={Bell} />
        <StatCard label="Critical alerts" value={statValue(state, (d) => d.totals.critical_alerts)} icon={Siren} tone="danger" />
        <StatCard label="Monitored entities" value={statValue(state, (d) => d.totals.monitored_entities)} icon={Waypoints} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartPanel state={state} onRetry={refetch} title="Metric activity over time" description="Observations received per day">
          {(d) => (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.metric_activity}>
                  <defs>
                    <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDayLabel} {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} width={48} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={(v) => formatDayLabel(String(v))} />
                  <Area type="monotone" dataKey="observations" name="Observations" stroke={CHART_COLORS.primary} fill="url(#activityFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>

        <ChartPanel state={state} onRetry={refetch} title="Normal vs anomalous observations" description="Daily split of observations by classification">
          {(d) => (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.observation_split}>
                  <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDayLabel} {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} width={48} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={(v) => formatDayLabel(String(v))} cursor={{ fill: 'hsl(222 30% 14%)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="normal" name="Normal" stackId="a" fill={CHART_COLORS.success} />
                  <Bar dataKey="anomalous" name="Anomalous" stackId="a" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>

        <ChartPanel state={state} onRetry={refetch} title="Alert severity distribution" description="Alerts by severity level">
          {(d) => (
            <div className="grid h-64 grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.severity_distribution} dataKey="count" nameKey="severity" innerRadius="58%" outerRadius="90%" paddingAngle={2} stroke="none">
                    {d.severity_distribution.map((entry) => (
                      <Cell key={entry.severity} fill={SEVERITY_STYLES[entry.severity].hex} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 text-sm">
                {d.severity_distribution.map((entry) => (
                  <li key={entry.severity} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${SEVERITY_STYLES[entry.severity].dot}`} aria-hidden="true" />
                      {SEVERITY_STYLES[entry.severity].label}
                    </span>
                    <span className="font-medium">{formatNumber(entry.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartPanel>

        <ChartPanel state={state} onRetry={refetch} title="Detection activity over time" description="Detections run per day">
          {(d) => (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.detection_activity}>
                  <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDayLabel} {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} width={48} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={(v) => formatDayLabel(String(v))} cursor={{ fill: 'hsl(222 30% 14%)' }} />
                  <Bar dataKey="detections" name="Detections" fill={CHART_COLORS.warning} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel title="Recent alerts" description="Latest alerts raised by the detection engine" className="xl:col-span-2">
          <QueryContent
            state={state}
            onRetry={refetch}
            isEmpty={(d) => d.recent_alerts.length === 0}
            emptyTitle="No alerts yet"
            emptyDescription="Alerts will appear here when anomalies cross your severity boundaries."
          >
            {(d) => (
              <div className="-mx-5 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Metric</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead className="pr-5">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.recent_alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="pl-5 font-medium">{alert.metric}</TableCell>
                        <TableCell className="text-muted-foreground">{alert.entity}</TableCell>
                        <TableCell>
                          <SeverityBadge severity={alert.severity} />
                        </TableCell>
                        <TableCell className="pr-5 text-muted-foreground">{formatDateTime(alert.timestamp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </QueryContent>
        </Panel>

        <Panel title="Recent detections" description="Latest results from detection runs">
          <QueryContent
            state={state}
            onRetry={refetch}
            isEmpty={(d) => d.recent_detections.length === 0}
            emptyTitle="No detections yet"
            emptyDescription="Run a detection to see results here."
          >
            {(d) => (
              <ul className="divide-y">
                {d.recent_detections.map((item, index) => (
                  <li key={`${item.timestamp}-${index}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium">
                        {item.metric} · {item.entity}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{item.explanation}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(item.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </QueryContent>
        </Panel>
      </div>
    </div>
  );
}
