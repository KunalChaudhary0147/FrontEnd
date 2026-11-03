import { useState } from 'react';
import { PlayCircle, Plus, ScanSearch, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, ResponsiveContainer } from 'recharts';
import { PageHeader, Panel } from '@/components/common/page-layout';
import { ActiveDatasetIndicator } from '@/components/common/active-dataset-indicator';
import { NotConnectedState } from '@/components/common/state-panels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBackendMutation } from '@/hooks/use-backend-mutation';
import { useBackendQuery } from '@/hooks/use-backend-query';
import { toast } from '@/hooks/use-toast';
import { isBackendConfigured } from '@/lib/api';
import { CHART_AXIS_TICK, CHART_COLORS, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '@/lib/chart-theme';
import { formatDecimal, formatNumber, formatPercent } from '@/lib/format';
import { SEVERITY_STYLES } from '@/lib/severity';
import { useActiveConfig } from '@/hooks/use-active-config';
import type { AdvancedMethod, DetectionResponse, MetricThreshold } from '@/types/domain';
import { ADVANCED_METHODS } from '@/types/domain';

const AXIS_PROPS = { tick: CHART_AXIS_TICK, axisLine: false, tickLine: false } as const;

export function DetectionPage() {
  if (!isBackendConfigured) {
    return (
      <div className="space-y-8">
        <PageHeader title="Anomaly Detection" description="Run threshold-based and statistical anomaly detection on your telemetry." actions={<ActiveDatasetIndicator />} />
        <Panel><NotConnectedState /></Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Anomaly Detection" description="Run threshold-based and statistical anomaly detection on your telemetry." />
      <Tabs defaultValue="generic">
        <TabsList>
          <TabsTrigger value="generic">Generic Detection</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Detection</TabsTrigger>
        </TabsList>
        <TabsContent value="generic"><GenericDetectionTab /></TabsContent>
        <TabsContent value="advanced"><AdvancedDetectionTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function GenericDetectionTab() {
  const { config, setConfig } = useActiveConfig();
  const [results, setResults] = useState<DetectionResponse | null>(null);
  const mutation = useBackendMutation<{ thresholds: MetricThreshold[] }, DetectionResponse>('/api/v1/detection/generic');

  const addThreshold = () => {
    setConfig({
      ...config,
      metricThresholds: [...config.metricThresholds, { metric: '', min: null, max: null }],
    });
  };

  const updateThreshold = (index: number, field: keyof MetricThreshold, value: string) => {
    const next = [...config.metricThresholds];
    if (field === 'metric') {
      next[index] = { ...next[index], metric: value };
    } else {
      const numValue = value === '' ? null : Number(value);
      next[index] = { ...next[index], [field]: Number.isNaN(numValue) ? null : numValue };
    }
    setConfig({ ...config, metricThresholds: next });
  };

  const removeThreshold = (index: number) => {
    setConfig({ ...config, metricThresholds: config.metricThresholds.filter((_, i) => i !== index) });
  };

  const handleRun = async () => {
    const valid = config.metricThresholds.filter((t) => t.metric.trim().length > 0);
    if (valid.length === 0) {
      toast({ title: 'No thresholds', description: 'Add at least one metric threshold before running detection.', variant: 'destructive' });
      return;
    }
    const data = await mutation.run({ thresholds: valid });
    if (data) {
      setResults(data);
      const anomalyCount = data.results.filter((r) => r.prediction).length;
      toast({ title: 'Detection complete', description: `${formatNumber(anomalyCount)} anomalies found in ${formatNumber(data.results.length)} observations.` });
    } else if (mutation.state.status === 'error') {
      toast({ title: 'Detection failed', description: mutation.state.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Metric thresholds" description="Set lower and upper bounds for each metric. Values outside these bounds are flagged as anomalies." actions={<Button variant="outline" size="sm" onClick={addThreshold}><Plus className="mr-2 h-4 w-4" /> Add threshold</Button>}>
        {config.metricThresholds.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No thresholds configured. Click "Add threshold" to begin.</p>
        ) : (
          <div className="space-y-3">
            {config.metricThresholds.map((threshold, index) => (
              <div key={index} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                <div className="space-y-2">
                  <Label>Metric name</Label>
                  <Input placeholder="e.g. cpu_usage" value={threshold.metric} onChange={(e) => updateThreshold(index, 'metric', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Lower bound</Label>
                  <Input type="number" placeholder="—" value={threshold.min ?? ''} onChange={(e) => updateThreshold(index, 'min', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Upper bound</Label>
                  <Input type="number" placeholder="—" value={threshold.max ?? ''} onChange={(e) => updateThreshold(index, 'max', e.target.value)} />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeThreshold(index)} aria-label="Remove threshold">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6">
          <Button onClick={handleRun} disabled={mutation.state.status === 'running'}>
            <PlayCircle className="mr-2 h-4 w-4" /> {mutation.state.status === 'running' ? 'Running…' : 'Run detection'}
          </Button>
        </div>
        {mutation.state.status === 'error' && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{mutation.state.message}</p>
        )}
      </Panel>

      {results && <ResultsPanel results={results} />}
    </div>
  );
}

function AdvancedDetectionTab() {
  const { config, setConfig } = useActiveConfig();
  const [method, setMethod] = useState<AdvancedMethod>('zscore');
  const [results, setResults] = useState<DetectionResponse | null>(null);
  const mutation = useBackendMutation<{ method: AdvancedMethod; sensitivity: number; window_size?: number }, DetectionResponse>('/api/v1/detection/advanced');

  const handleRun = async () => {
    const body: Record<string, unknown> = { method, sensitivity: config.zScoreSensitivity };
    if (method === 'rolling_zscore') body.window_size = config.rollingWindowSize;
    if (method === 'multivariate') body.sensitivity = config.multivariateSensitivity;
    const data = await mutation.run(body as { method: AdvancedMethod; sensitivity: number; window_size?: number });
    if (data) {
      setResults(data);
      const anomalyCount = data.results.filter((r) => r.prediction).length;
      toast({ title: 'Detection complete', description: `${formatNumber(anomalyCount)} anomalies found in ${formatNumber(data.results.length)} observations.` });
    } else if (mutation.state.status === 'error') {
      toast({ title: 'Detection failed', description: mutation.state.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Advanced detection" description="Choose a statistical method and tune its parameters.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Detection method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as AdvancedMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ADVANCED_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {method === 'zscore' && (
            <div className="space-y-3">
              <Label>Z-score sensitivity: {formatDecimal(config.zScoreSensitivity)}</Label>
              <Slider min={1} max={6} step={0.1} value={[config.zScoreSensitivity]} onValueChange={([v]) => setConfig({ ...config, zScoreSensitivity: v })} />
              <p className="text-xs text-muted-foreground">Higher values require larger deviations to flag anomalies.</p>
            </div>
          )}

          {method === 'rolling_zscore' && (
            <>
              <div className="space-y-3">
                <Label>Z-score sensitivity: {formatDecimal(config.zScoreSensitivity)}</Label>
                <Slider min={1} max={6} step={0.1} value={[config.zScoreSensitivity]} onValueChange={([v]) => setConfig({ ...config, zScoreSensitivity: v })} />
              </div>
              <div className="space-y-3">
                <Label>Rolling window size: {config.rollingWindowSize}</Label>
                <Slider min={5} max={100} step={1} value={[config.rollingWindowSize]} onValueChange={([v]) => setConfig({ ...config, rollingWindowSize: v })} />
                <p className="text-xs text-muted-foreground">Number of recent observations used for the local mean and standard deviation.</p>
              </div>
            </>
          )}

          {method === 'multivariate' && (
            <div className="space-y-3">
              <Label>Multivariate sensitivity: {formatDecimal(config.multivariateSensitivity)}</Label>
              <Slider min={0.5} max={0.99} step={0.01} value={[config.multivariateSensitivity]} onValueChange={([v]) => setConfig({ ...config, multivariateSensitivity: v })} />
              <p className="text-xs text-muted-foreground">Higher values detect more subtle multivariate deviations.</p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Button onClick={handleRun} disabled={mutation.state.status === 'running'}>
            <ScanSearch className="mr-2 h-4 w-4" /> {mutation.state.status === 'running' ? 'Running…' : 'Run advanced detection'}
          </Button>
        </div>
        {mutation.state.status === 'error' && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{mutation.state.message}</p>
        )}
      </Panel>

      {results && <ResultsPanel results={results} />}
    </div>
  );
}

function ResultsPanel({ results }: { results: DetectionResponse }) {
  const anomalyCount = results.results.filter((r) => r.prediction).length;
  const normalCount = results.results.length - anomalyCount;
  const anomalyPct = results.results.length > 0 ? anomalyCount / results.results.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ResultStat label="Observations analyzed" value={formatNumber(results.results.length)} />
        <ResultStat label="Anomalies detected" value={formatNumber(anomalyCount)} />
        <ResultStat label="Normal observations" value={formatNumber(normalCount)} />
        <ResultStat label="Anomaly percentage" value={formatPercent(anomalyPct)} />
      </div>

      {results.evaluation && <EvaluationPanel evaluation={results.evaluation} />}

      <Panel title="Anomaly scatter" description="Observed value vs statistical score, colored by severity.">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid stroke={CHART_GRID_STROKE} />
              <XAxis type="number" dataKey="observed_value" name="Observed" {...AXIS_PROPS} width={56} />
              <YAxis type="number" dataKey="score" name="Score" {...AXIS_PROPS} width={56} />
              <ZAxis range={[60, 60]} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={results.results.filter((r) => r.prediction)}>
                {results.results.filter((r) => r.prediction).map((entry, i) => (
                  <Cell key={i} fill={SEVERITY_STYLES[entry.severity].hex} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Detection results" description="Detailed results for each observation.">
        <div className="-mx-5 max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b">
                <th className="px-5 py-2 text-left font-medium text-muted-foreground">Metric</th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">Entity</th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">Observed</th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">Reference</th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">Score</th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">Method</th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">Prediction</th>
                <th className="pr-5 py-2 text-left font-medium text-muted-foreground">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {results.results.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-5 py-2 font-medium">{r.metric}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.entity}</td>
                  <td className="px-2 py-2">{formatDecimal(r.observed_value)}</td>
                  <td className="px-2 py-2">{formatDecimal(r.reference_value)}</td>
                  <td className="px-2 py-2">{formatDecimal(r.score)}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.method}</td>
                  <td className="px-2 py-2">{r.prediction ? <span className="text-rose-300">Anomaly</span> : <span className="text-muted-foreground">Normal</span>}</td>
                  <td className="pr-5 py-2 max-w-xs truncate text-muted-foreground" title={r.explanation}>{r.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function EvaluationPanel({ evaluation }: { evaluation: NonNullable<DetectionResponse['evaluation']> }) {
  const { confusion_matrix: cm } = evaluation;
  const barData = [
    { label: 'Precision', value: evaluation.precision },
    { label: 'Recall', value: evaluation.recall },
    { label: 'F1', value: evaluation.f1 },
    { label: 'Accuracy', value: evaluation.accuracy },
  ];

  return (
    <Panel title="Evaluation" description="Ground-truth labels were available for this run, so model performance is shown below.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-sm font-medium">Scores</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" {...AXIS_PROPS} />
                <YAxis domain={[0, 1]} {...AXIS_PROPS} width={48} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => formatPercent(v)} cursor={{ fill: 'hsl(222 30% 14%)' }} />
                <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricBox label="Precision" value={formatPercent(evaluation.precision)} />
            <MetricBox label="Recall" value={formatPercent(evaluation.recall)} />
            <MetricBox label="F1 score" value={formatDecimal(evaluation.f1)} />
            <MetricBox label="Accuracy" value={formatPercent(evaluation.accuracy)} />
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-medium">Confusion matrix</h3>
          <div className="grid grid-cols-2 gap-3">
            <ConfusionCell label="True positives" value={cm.tp} tone="success" />
            <ConfusionCell label="False positives" value={cm.fp} tone="warning" />
            <ConfusionCell label="False negatives" value={cm.fn} tone="warning" />
            <ConfusionCell label="True negatives" value={cm.tn} tone="success" />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function ConfusionCell({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' }) {
  const toneClass = tone === 'success' ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-amber-400/30 bg-amber-400/10';
  const textClass = tone === 'success' ? 'text-emerald-300' : 'text-amber-300';
  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${textClass}`}>{formatNumber(value)}</p>
    </div>
  );
}
