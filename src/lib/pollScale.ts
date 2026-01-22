import type { ScaleConfig } from '@/types/poll';

export type ScaleDisplay = 'stars' | 'slider';

export const getScaleConfig = (config?: ScaleConfig | null) => ({
  min: config?.min ?? 0,
  max: config?.max ?? 10,
  step: config?.step ?? 1,
  display: config?.display ?? 'stars',
  min_label: config?.min_label ?? '',
  max_label: config?.max_label ?? '',
});

export const clampScaleValue = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const getStepPrecision = (step: number) => {
  const text = step.toString();
  const parts = text.split('.');
  return parts.length > 1 ? parts[1].length : 0;
};

export const roundToStep = (value: number, step: number, min: number) => {
  if (!Number.isFinite(step) || step <= 0) return value;
  const rounded = Math.round((value - min) / step) * step + min;
  const precision = getStepPrecision(step);
  return Number(rounded.toFixed(precision));
};

export const formatScaleValue = (value: number, step: number) => {
  const precision = getStepPrecision(step);
  return precision > 0 ? value.toFixed(precision) : `${value}`;
};

export const getScaleSteps = (min: number, max: number, step: number) => {
  if (!Number.isFinite(step) || step <= 0 || max < min) return [];
  const steps: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) {
    steps.push(roundToStep(v, step, min));
  }
  return steps;
};
