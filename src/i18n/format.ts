import { formatDistanceToNow } from 'date-fns';

import { getIntlLocale, type Language } from '@/i18n/config';
import { DATE_LOCALE_BY_LANGUAGE } from '@/lib/dateLocale';

type MessageValue = string | number | boolean | null | undefined;
type MessageValues = Record<string, MessageValue>;

const MESSAGE_TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{([a-zA-Z0-9_]+)\}/g;

const toDate = (value: string | number | Date): Date => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }
  return date;
};

export const interpolateMessage = (template: string, values: MessageValues = {}): string =>
  template.replace(MESSAGE_TOKEN_REGEX, (_, doubleBraceKey: string, singleBraceKey: string) => {
    const key = doubleBraceKey || singleBraceKey;
    const value = values[key];
    return value === null || value === undefined ? '' : String(value);
  });

export const formatLabelValue = (label: string, value: string, language: Language): string => {
  if (language === 'fr') return `${label}\u202f: ${value}`;
  if (language === 'zh-TW') return `${label}\uff1a${value}`;
  return `${label}: ${value}`;
};

type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

interface PluralMessageOptions {
  language: Language;
  count: number;
  forms: PluralForms;
  values?: MessageValues;
  countKey?: string;
}

export const formatPluralMessage = ({
  language,
  count,
  forms,
  values = {},
  countKey = 'count',
}: PluralMessageOptions): string => {
  const rules = new Intl.PluralRules(getIntlLocale(language));
  const category = rules.select(count) as PluralForm;
  const template = forms[category] ?? forms.other;
  return interpolateMessage(template, {
    ...values,
    [countKey]: count,
  });
};

export const formatDateLocalized = (
  value: string | number | Date,
  language: Language,
  options?: Intl.DateTimeFormatOptions,
): string =>
  new Intl.DateTimeFormat(getIntlLocale(language), options).format(toDate(value));

export const formatDateTimeLocalized = (
  value: string | number | Date,
  language: Language,
  options?: Intl.DateTimeFormatOptions,
): string =>
  formatDateLocalized(value, language, options);

const DATE_TIME_INPUT_PLACEHOLDER_SAMPLE = new Date(2026, 5, 20, 21, 30);
const DATE_TIME_INPUT_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};
type DateTimeInputPart = 'year' | 'month' | 'day' | 'hour' | 'minute';
type DateTimeInputParts = Record<DateTimeInputPart, number>;
const DATE_TIME_INPUT_TOKEN_BY_PART: Record<DateTimeInputPart, string> = {
  year: 'YYYY',
  month: 'MM',
  day: 'DD',
  hour: 'HH',
  minute: 'mm',
};

const getDateTimeInputPartOrder = (language: Language): DateTimeInputPart[] =>
  new Intl.DateTimeFormat(getIntlLocale(language), DATE_TIME_INPUT_FORMAT_OPTIONS)
    .formatToParts(DATE_TIME_INPUT_PLACEHOLDER_SAMPLE)
    .map((part) => part.type)
    .filter((type): type is DateTimeInputPart =>
      ['year', 'month', 'day', 'hour', 'minute'].includes(type),
    );

const hasValidDateTimeInputRanges = ({ year, month, day, hour, minute }: DateTimeInputParts) =>
  year >= 1000 &&
  month >= 1 &&
  month <= 12 &&
  day >= 1 &&
  day <= 31 &&
  hour >= 0 &&
  hour <= 23 &&
  minute >= 0 &&
  minute <= 59;

const isExactLocalDateTime = (
  date: Date,
  { year, month, day, hour, minute }: DateTimeInputParts,
) =>
  date.getFullYear() === year &&
  date.getMonth() === month - 1 &&
  date.getDate() === day &&
  date.getHours() === hour &&
  date.getMinutes() === minute;

export const formatDateTimeInputPlaceholder = (language: Language): string =>
  new Intl.DateTimeFormat(getIntlLocale(language), DATE_TIME_INPUT_FORMAT_OPTIONS)
    .formatToParts(DATE_TIME_INPUT_PLACEHOLDER_SAMPLE)
    .map((part) =>
      part.type in DATE_TIME_INPUT_TOKEN_BY_PART
        ? DATE_TIME_INPUT_TOKEN_BY_PART[part.type as DateTimeInputPart]
        : part.value,
    )
    .join('');

export const formatDateTimeInputValue = (
  value: string | number | Date,
  language: Language,
): string =>
  new Intl.DateTimeFormat(getIntlLocale(language), DATE_TIME_INPUT_FORMAT_OPTIONS).format(
    toDate(value),
  );

export const parseDateTimeInputValue = (value: string, language: Language): Date | null => {
  const numericParts = value.match(/\d+/g);
  if (!numericParts || numericParts.length < 5) return null;

  const values: Partial<DateTimeInputParts> = {};
  for (const [index, type] of getDateTimeInputPartOrder(language).entries()) {
    values[type] = Number(numericParts[index]);
  }

  if (!values.year || !values.month || !values.day) return null;
  if (values.hour === undefined || values.minute === undefined) return null;

  const dateTimeParts = values as DateTimeInputParts;
  if (!hasValidDateTimeInputRanges(dateTimeParts)) return null;

  const parsed = new Date(
    dateTimeParts.year,
    dateTimeParts.month - 1,
    dateTimeParts.day,
    dateTimeParts.hour,
    dateTimeParts.minute,
  );

  return isExactLocalDateTime(parsed, dateTimeParts) ? parsed : null;
};

export const formatNumberLocalized = (
  value: number,
  language: Language,
  options?: Intl.NumberFormatOptions,
): string => new Intl.NumberFormat(getIntlLocale(language), options).format(value);

export const formatDistanceFromNowLocalized = (
  value: string | number | Date,
  language: Language,
  addSuffix = true,
): string =>
  formatDistanceToNow(toDate(value), {
    addSuffix,
    locale: DATE_LOCALE_BY_LANGUAGE[language],
  });
