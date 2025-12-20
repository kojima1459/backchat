// ルームキーの正規化
export const normalizeRoomKey = (key: string): string => {
  // trim + NFKC正規化
  return key.trim().normalize('NFKC');
};

// ルームキーのバリデーション
// ASCII printable (0x21-0x7E) のみ許可、10文字以上
export const validateRoomKey = (key: string): { valid: boolean; error?: string } => {
  const normalized = normalizeRoomKey(key);
  
  if (normalized.length < 10) {
    return { valid: false, error: 'キーが短いか、形式が違うみたい' };
  }
  
  // ASCII printable文字のみ許可
  const asciiPrintableRegex = /^[\x21-\x7E]{10,}$/;
  if (!asciiPrintableRegex.test(normalized)) {
    return { valid: false, error: 'キーが短いか、形式が違うみたい' };
  }
  
  return { valid: true };
};

// SHA-256ハッシュでroomIdを生成
export const deriveRoomId = async (roomKey: string): Promise<string> => {
  const normalized = normalizeRoomKey(roomKey);
  const validation = validateRoomKey(normalized);
  
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // Web Crypto APIでSHA-256ハッシュを計算
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // ArrayBufferを16進数文字列に変換
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

// 16文字の英数字ルームキーを生成
export const generateRoomKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 16;
  
  // crypto.getRandomValuesを使用して安全な乱数を生成
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  
  return result;
};
