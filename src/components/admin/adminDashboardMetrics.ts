export const formatPercentValue = (value: number | null | undefined, fractionDigits = 0): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return `${value.toFixed(fractionDigits)}%`;
};

export const formatSignedPercentDelta = (value: number | null | undefined): string | null => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const fractionDigits = Math.abs(value) >= 10 ? 0 : 1;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(fractionDigits)}%`;
};

export const getDeltaColorClass = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'text-muted-foreground';
  }

  if (value > 0) {
    return 'text-status-success';
  }

  if (value < 0) {
    return 'text-status-error';
  }

  return 'text-muted-foreground';
};

