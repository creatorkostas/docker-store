import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

export interface Settings {
  yacht: Record<string, string>;
  disableSaveToServer: boolean;
  themeColor: string;
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
  },
  disableSaveToServer: false,
  themeColor: 'zinc'
};

export function getSettings(): Settings {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return DEFAULT_SETTINGS;
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        yacht: { ...DEFAULT_SETTINGS.yacht, ...parsed.yacht }
    };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  console.log(`Attempting to save settings to: ${SETTINGS_FILE}`);
  console.log(`Data directory: ${DATA_DIR}`);
  
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`Directory does not exist. Creating: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log(`Successfully wrote to ${SETTINGS_FILE}`);
  } catch (e: any) {
    console.error(`Failed to write settings file at ${SETTINGS_FILE}:`, e);
    throw e;
  }
}
