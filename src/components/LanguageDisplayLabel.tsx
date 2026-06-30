import { LANGUAGE_OPTIONS, type Language } from '@/i18n/config';

type LanguageDisplayLabelProps = {
  language: Language;
};

type LanguageFlagProps = {
  language: Language;
};

const LanguageFlag = ({ language }: LanguageFlagProps) => {
  const commonProps = {
    'aria-hidden': true,
    className: 'h-3 w-4 shrink-0 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_hsl(var(--border)/0.55)]',
    focusable: false,
    viewBox: '0 0 16 12',
  } as const;

  switch (language) {
    case 'fr':
      return (
        <svg {...commonProps}>
          <rect width="16" height="12" fill="#fff" />
          <rect width="5.33" height="12" fill="#0055a4" />
          <rect x="10.67" width="5.33" height="12" fill="#ef4135" />
        </svg>
      );
    case 'de':
      return (
        <svg {...commonProps}>
          <rect width="16" height="4" fill="#000" />
          <rect y="4" width="16" height="4" fill="#dd0000" />
          <rect y="8" width="16" height="4" fill="#ffce00" />
        </svg>
      );
    case 'es':
      return (
        <svg {...commonProps}>
          <rect width="16" height="12" fill="#aa151b" />
          <rect y="3" width="16" height="6" fill="#f1bf00" />
        </svg>
      );
    case 'pt-BR':
      return (
        <svg {...commonProps}>
          <rect width="16" height="12" fill="#009b3a" />
          <path d="M8 1.3 14.2 6 8 10.7 1.8 6Z" fill="#ffdf00" />
          <circle cx="8" cy="6" r="2.4" fill="#002776" />
        </svg>
      );
    case 'it':
      return (
        <svg {...commonProps}>
          <rect width="16" height="12" fill="#fff" />
          <rect width="5.33" height="12" fill="#009246" />
          <rect x="10.67" width="5.33" height="12" fill="#ce2b37" />
        </svg>
      );
    case 'ru':
      return (
        <svg {...commonProps}>
          <rect width="16" height="4" fill="#fff" />
          <rect y="4" width="16" height="4" fill="#0039a6" />
          <rect y="8" width="16" height="4" fill="#d52b1e" />
        </svg>
      );
    case 'zh-TW':
      return (
        <svg {...commonProps}>
          <rect width="16" height="12" fill="#fe0000" />
          <rect width="8" height="6" fill="#000095" />
          <circle cx="4" cy="3" r="1.4" fill="#fff" />
        </svg>
      );
    case 'ko':
      return (
        <svg {...commonProps}>
          <rect width="16" height="12" fill="#fff" />
          <path d="M5.8 6a2.2 2.2 0 0 1 4.4 0c0 1.2-1 2.2-2.2 2.2A2.2 2.2 0 0 0 5.8 6Z" fill="#c60c30" />
          <path d="M10.2 6a2.2 2.2 0 0 1-4.4 0c0-1.2 1-2.2 2.2-2.2A2.2 2.2 0 0 0 10.2 6Z" fill="#003478" />
          <path d="M3 2h2.4M10.6 2H13M3 10h2.4M10.6 10H13" stroke="#111" strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      );
    case 'en':
    default:
      return (
        <svg {...commonProps}>
          <rect width="16" height="12" fill="#b22234" />
          <path d="M0 1h16M0 3h16M0 5h16M0 7h16M0 9h16M0 11h16" stroke="#fff" strokeWidth="1" />
          <rect width="7" height="6.5" fill="#3c3b6e" />
          <path d="M1.2 1.1h1M3.3 1.1h1M5.4 1.1h1M1.2 3.1h1M3.3 3.1h1M5.4 3.1h1M1.2 5.1h1M3.3 5.1h1M5.4 5.1h1" stroke="#fff" strokeWidth="0.35" strokeLinecap="round" />
        </svg>
      );
  }
};

export const LanguageDisplayLabel = ({ language }: LanguageDisplayLabelProps) => {
  const option = LANGUAGE_OPTIONS.find((entry) => entry.code === language);

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <LanguageFlag language={language} />
      <span lang={language} className="language-display-label truncate">
        {option?.label || language}
      </span>
    </span>
  );
};
