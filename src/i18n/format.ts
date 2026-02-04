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
