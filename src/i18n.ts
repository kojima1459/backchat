export type Language = 'ja' | 'en';

const DICTIONARY = {
  ja: {
    settingsTitle: '設定',
    sectionDisplay: '表示',
    sectionControls: '操作',
    sectionData: 'データ',
    sectionAbout: '情報',
    labelTheme: 'テーマ',
    labelLanguage: '言語',
    labelLongPress: '長押し時間',
    labelStorage: '保存先',
    valueStorageDevice: 'この端末',
    labelVersion: 'バージョン',
    themeSystem: 'システム',
    themeLight: 'ライト',
    themeDark: 'ダーク',
    langJa: '日本語',
    langEn: 'English',
    longPressShort: '短い',
    longPressStandard: '標準',
    longPressLong: '長い',
    longPressCustom: 'カスタム',
    kindReply: '返信',
    kindPayment: '支払い',
  },
  en: {
    settingsTitle: 'Settings',
    sectionDisplay: 'Display',
    sectionControls: 'Controls',
    sectionData: 'Data',
    sectionAbout: 'About',
    labelTheme: 'Theme',
    labelLanguage: 'Language',
    labelLongPress: 'Long-press',
    labelStorage: 'Storage',
    valueStorageDevice: 'This device',
    labelVersion: 'Version',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    langJa: 'Japanese',
    langEn: 'English',
    longPressShort: 'Short',
    longPressStandard: 'Standard',
    longPressLong: 'Long',
    longPressCustom: 'Custom',
    kindReply: 'Reply',
    kindPayment: 'Pay',
  },
} as const;

export type TranslationKey = keyof typeof DICTIONARY.ja;

export const t = (language: Language, key: TranslationKey): string => {
  return DICTIONARY[language]?.[key] ?? DICTIONARY.ja[key];
};
