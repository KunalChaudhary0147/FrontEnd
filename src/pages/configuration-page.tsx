import { useState } from 'react';
import { FolderOpen, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader, Panel } from '@/components/common/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { deleteConfiguration, saveConfiguration, useSavedConfigurations } from '@/hooks/use-saved-configurations';
import { useActiveConfig } from '@/hooks/use-active-config';
import { toast } from '@/hooks/use-toast';
import { describeError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { MetricThreshold, SeverityBoundaries } from '@/types/domain';

const SEVERITY_KEYS: (keyof SeverityBoundaries)[] = ['low', 'medium', 'high', 'critical'];

export function ConfigurationPage() {
  const { config, setConfig, activeName, setActiveName } = useActiveConfig();
  const { configs, loading, error, reload } = useSavedConfigurations();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const addThreshold = () => {
    setConfig({ ...config, metricThresholds: [...config.metricThresholds, { metric: '', min: null, max: null }] });
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

  const updateBoundary = (key: keyof SeverityBoundaries, value: number) => {
    setConfig({ ...config, severityBoundaries: { ...config.severityBoundaries, [key]: value } });
  };

  const handleSave = async () => {
    const trimmed = name.trim() || activeName;
    if (!trimmed) {
      toast({ title: 'Name required', description: 'Enter a configuration name before saving.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saveConfiguration(trimmed, config);
      setActiveName(trimmed);
      setName('');
      toast({ title: 'Configuration saved', description: `"${trimmed}" has been saved.` });
      reload();
    } catch (err) {
      toast({ title: 'Save failed', description: describeError(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = (selectedName: string) => {
    const found = configs.find((c) => c.name === selectedName);
    if (!found) return;
    setConfig(found.config);
    setActiveName(found.name);
    toast({ title: 'Configuration loaded', description: `"${found.name}" is now active on the detection pages.` });
  };

  const handleDelete = async (id: string, configName: string) => {
    try {
      await deleteConfiguration(id);
      if (activeName === configName) setActiveName(null);
      toast({ title: 'Configuration deleted', description: `"${configName}" was removed.` });
      reload();
    } catch (err) {
      toast({ title: 'Delete failed', description: describeError(err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configuration"
        description="Define metric thresholds, statistical detection parameters, and alert severity boundaries. Save and load named configurations."
      />

      <Panel title="Saved configurations" description="Load a previously saved configuration to apply it on the detection pages.">
        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading saved configurations…</p>
        ) : error ? (
          <p className="py-4 text-sm text-destructive">{error}</p>
        ) : configs.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No saved configurations yet. Configure the settings below and save them with a name.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-5 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">Last updated</th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">Thresholds</th>
                  <th className="pr-5 py-2 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((saved) => (
                  <tr key={saved.id} className="border-b last:border-0">
                    <td className="px-5 py-3 font-medium">
                      {saved.name}
                      {activeName === saved.name && <span className="ml-2 text-xs text-primary">Active</span>}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">{formatDateTime(saved.updated_at)}</td>
                    <td className="px-2 py-3 text-muted-foreground">{saved.config.metricThresholds.length}</td>
                    <td className="pr-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleLoad(saved.name)}>
                          <FolderOpen className="mr-1 h-4 w-4" /> Load
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => handleDelete(saved.id, saved.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Metric thresholds" description="Set lower and upper bounds for each metric. Values outside these bounds are flagged." actions={<Button variant="outline" size="sm" onClick={addThreshold}><Plus className="mr-2 h-4 w-4" /> Add threshold</Button>}>
        {config.metricThresholds.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No thresholds configured.</p>
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
      </Panel>

      <Panel title="Statistical settings" description="Parameters used by the advanced detection methods.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="space-y-3">
            <Label>Z-score sensitivity: {config.zScoreSensitivity}</Label>
            <Slider min={1} max={6} step={0.1} value={[config.zScoreSensitivity]} onValueChange={([v]) => setConfig({ ...config, zScoreSensitivity: v })} />
            <p className="text-xs text-muted-foreground">Number of standard deviations considered anomalous.</p>
          </div>
          <div className="space-y-3">
            <Label>Rolling window size: {config.rollingWindowSize}</Label>
            <Slider min={5} max={100} step={1} value={[config.rollingWindowSize]} onValueChange={([v]) => setConfig({ ...config, rollingWindowSize: v })} />
            <p className="text-xs text-muted-foreground">Observations used for the rolling baseline.</p>
          </div>
          <div className="space-y-3">
            <Label>Multivariate sensitivity: {config.multivariateSensitivity}</Label>
            <Slider min={0.5} max={0.99} step={0.01} value={[config.multivariateSensitivity]} onValueChange={([v]) => setConfig({ ...config, multivariateSensitivity: v })} />
            <p className="text-xs text-muted-foreground">Threshold for multivariate distance scores.</p>
          </div>
        </div>
      </Panel>

      <Panel title="Alert severity policy" description="Z-score boundaries that determine alert severity levels.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SEVERITY_KEYS.map((key) => (
            <div key={key} className="space-y-3">
              <Label>{key.charAt(0).toUpperCase() + key.slice(1)}: {config.severityBoundaries[key]}</Label>
              <Slider
                min={1}
                max={10}
                step={0.5}
                value={[config.severityBoundaries[key]]}
                onValueChange={([v]) => updateBoundary(key, v)}
              />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Save configuration" description={activeName ? `Updating "${activeName}" or saving as a new name.` : 'Save the current settings with a name so they can be loaded later.'}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Configuration name</Label>
            <Input placeholder={activeName ?? 'e.g. Production CPU policy'} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : activeName && !name ? `Save "${activeName}"` : 'Save configuration'}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
