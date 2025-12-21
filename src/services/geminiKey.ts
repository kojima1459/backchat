const GEMINI_API_KEY_STORAGE_KEY = 'geminiApiKey';

export const getGeminiApiKey = (): string | null => {
  try {
    const stored = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    const trimmed = stored?.trim() ?? '';
    return trimmed ? trimmed : null;
  } catch (error) {
    console.warn('[geminiKey] localStorage.getItem failed:', error);
    return null;
  }
};

export const setGeminiApiKey = (key: string): void => {
  const trimmed = key.trim();
  if (!trimmed) {
    clearGeminiApiKey();
    return;
  }
  try {
    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
  } catch (error) {
    console.warn('[geminiKey] localStorage.setItem failed:', error);
  }
};

export const clearGeminiApiKey = (): void => {
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch (error) {
    console.warn('[geminiKey] localStorage.removeItem failed:', error);
  }
};
