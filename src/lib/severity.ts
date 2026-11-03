import type { Severity } from '@/types/domain';

interface SeverityStyle {
  label: string;
  badge: string;
  text: string;
  dot: string;
  hex: string;
}

export const SEVERITY_STYLES: Record<Severity, SeverityStyle> = {
  normal: {
    label: 'Normal',
    badge: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    hex: '#34d399',
  },
  low: {
    label: 'Low',
    badge: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
    text: 'text-sky-300',
    dot: 'bg-sky-400',
    hex: '#38bdf8',
  },
  medium: {
    label: 'Medium',
    badge: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    hex: '#fbbf24',
  },
  high: {
    label: 'High',
    badge: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
    text: 'text-orange-300',
    dot: 'bg-orange-400',
    hex: '#fb923c',
  },
  critical: {
    label: 'Critical',
    badge: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
    text: 'text-rose-300',
    dot: 'bg-rose-400',
    hex: '#fb7185',
  },
};
