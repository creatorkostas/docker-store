import fs from 'fs';
import path from 'path';
import { Source } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const SOURCES_FILE = path.join(DATA_DIR, 'sources.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getSources(): Source[] {
  if (!fs.existsSync(SOURCES_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(SOURCES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading sources file:', error);
    return [];
  }
}

export function saveSources(sources: Source[]) {
  fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2));
}

export function addSource(source: Source) {
  const sources = getSources();
  // Check for duplicates
  if (sources.some(s => s.url === source.url)) {
    throw new Error('Source with this URL already exists');
  }
  sources.push(source);
  saveSources(sources);
}

export function updateSource(updatedSource: Source) {
  const sources = getSources();
  const index = sources.findIndex(s => s.id === updatedSource.id);
  if (index !== -1) {
    sources[index] = updatedSource;
    saveSources(sources);
  }
}

export function removeSource(id: string) {
  const sources = getSources();
  const filtered = sources.filter(s => s.id !== id);
  saveSources(filtered);
}
