const STORAGE_KEY = 'roomLabels';

type RoomLabelMap = Record<string, string>;

const readLabels = (): RoomLabelMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RoomLabelMap;
    return parsed ?? {};
  } catch {
    return {};
  }
};

const writeLabels = (labels: RoomLabelMap) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
};

export const getRoomLabel = (roomId: string): string | null => {
  const labels = readLabels();
  return labels[roomId] ?? null;
};

export const setRoomLabel = (roomId: string, label: string): void => {
  const trimmed = label.trim();
  const labels = readLabels();

  if (!trimmed) {
    delete labels[roomId];
  } else {
    labels[roomId] = trimmed;
  }

  writeLabels(labels);
};

export const clearRoomLabel = (roomId: string): void => {
  const labels = readLabels();
  if (!(roomId in labels)) return;
  delete labels[roomId];
  writeLabels(labels);
};
