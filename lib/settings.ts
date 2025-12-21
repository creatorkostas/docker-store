import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

export interface Settings {
  yacht: Record<string, string>;
}

const DEFAULT_SETTINGS: Settings = {
  yacht: {
    '!PUID': '1000',
    '!PGID': '1000',
    '!TZ': 'Etc/UTC',
    '!config': './config',
    '!downloads': './downloads',
    '!music': './music',
    '!movies': './movies',
    '!tv': './tv',
    '!books': './books',
    '!comics': './comics',
    '!podcasts': './podcasts'
  }
};

export function getSettings(): Settings {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return DEFAULT_SETTINGS;
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    // Deep merge or just top level? Top level is fine for now as we only have one category.
    const parsed = JSON.parse(data);
    return {
        yacht: { ...DEFAULT_SETTINGS.yacht, ...parsed.yacht }
    };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
