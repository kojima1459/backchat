import { X } from 'lucide-react';
import { t, type Language } from '../i18n';

type ThemeSetting = 'system' | 'light' | 'dark';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretLongPressDelay: number;
  onSecretLongPressDelayChange: (delay: number) => void;
  themeSetting: ThemeSetting;
  onThemeSettingChange: (setting: ThemeSetting) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export const SettingsModal = ({ 
  isOpen, 
  onClose, 
  secretLongPressDelay,
  onSecretLongPressDelayChange,
  themeSetting,
  onThemeSettingChange,
  language,
  onLanguageChange,
}: SettingsModalProps) => {
  const versionLabel = __APP_COMMIT__
    ? `v${__APP_VERSION__} (${__APP_COMMIT__})`
    : `v${__APP_VERSION__}`;
  const themeOptions: Array<{ value: ThemeSetting; labelKey: Parameters<typeof t>[1] }> = [
    { value: 'system', labelKey: 'themeSystem' },
    { value: 'light', labelKey: 'themeLight' },
    { value: 'dark', labelKey: 'themeDark' },
  ];
  const languageOptions: Array<{ value: Language; labelKey: Parameters<typeof t>[1] }> = [
    { value: 'ja', labelKey: 'langJa' },
    { value: 'en', labelKey: 'langEn' },
  ];
  const longPressOptions: Array<{ value: number; labelKey: Parameters<typeof t>[1] }> = [
    { value: 2000, labelKey: 'longPressShort' },
    { value: 3000, labelKey: 'longPressStandard' },
    { value: 5000, labelKey: 'longPressLong' },
    { value: 8000, labelKey: 'longPressCustom' },
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-card-white rounded-t-2xl p-6 safe-area-bottom
          animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-main">{t(language, 'settingsTitle')}</h2>
          <button
            onClick={onClose}
            className="tap-target p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-text-sub" />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <p className="text-xs font-semibold text-text-muted mb-2">
              {t(language, 'sectionDisplay')}
            </p>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-text-main mb-2">
                  {t(language, 'labelTheme')}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {themeOptions.map((option) => {
                    const isActive = themeSetting === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onThemeSettingChange(option.value)}
                        className={`px-2 py-2 rounded-lg border text-sm font-medium
                          transition-colors
                          ${isActive
                            ? 'bg-brand-mint/15 border-brand-mint text-brand-mint'
                            : 'bg-bg-soft border-border-light text-text-sub hover:bg-gray-100'
                          }`}
                      >
                        {t(language, option.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-text-main mb-2">
                  {t(language, 'labelLanguage')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {languageOptions.map((option) => {
                    const isActive = language === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onLanguageChange(option.value)}
                        className={`px-2 py-2 rounded-lg border text-sm font-medium
                          transition-colors
                          ${isActive
                            ? 'bg-brand-mint/15 border-brand-mint text-brand-mint'
                            : 'bg-bg-soft border-border-light text-text-sub hover:bg-gray-100'
                          }`}
                      >
                        {t(language, option.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-text-muted mb-2">
              {t(language, 'sectionControls')}
            </p>
            <div>
              <div className="text-sm font-medium text-text-main mb-2">
                {t(language, 'labelLongPress')}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {longPressOptions.map((option) => {
                  const isActive = secretLongPressDelay === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSecretLongPressDelayChange(option.value)}
                      className={`px-2 py-2 rounded-lg border text-sm font-medium
                        transition-colors
                        ${isActive
                          ? 'bg-brand-mint/15 border-brand-mint text-brand-mint'
                          : 'bg-bg-soft border-border-light text-text-sub hover:bg-gray-100'
                        }`}
                    >
                      {t(language, option.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-text-muted mb-2">
              {t(language, 'sectionData')}
            </p>
            <div className="flex items-center justify-between p-3 bg-bg-soft rounded-lg">
              <span className="text-sm font-medium text-text-main">
                {t(language, 'labelStorage')}
              </span>
              <span className="text-xs text-text-muted">
                {t(language, 'valueStorageDevice')}
              </span>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-text-muted mb-2">
              {t(language, 'sectionAbout')}
            </p>
            <div className="flex items-center justify-between p-3 bg-bg-soft rounded-lg">
              <span className="text-sm font-medium text-text-main">
                {t(language, 'labelVersion')}
              </span>
              <span className="text-xs text-text-muted">
                {versionLabel}
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
