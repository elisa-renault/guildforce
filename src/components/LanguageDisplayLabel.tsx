import { LANGUAGE_FLAG_BY_CODE, LANGUAGE_OPTIONS, type Language } from '@/i18n/config';

type LanguageDisplayLabelProps = {
  language: Language;
};

export const LanguageDisplayLabel = ({ language }: LanguageDisplayLabelProps) => {
  const option = LANGUAGE_OPTIONS.find((entry) => entry.code === language);

  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5">
      <span aria-hidden="true" className="shrink-0 text-[0.72em] uppercase tracking-normal">
        {LANGUAGE_FLAG_BY_CODE[language]}
      </span>
      <span lang={language} className="language-display-label truncate">
        {option?.label || language}
      </span>
    </span>
  );
};
