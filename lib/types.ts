export type SourceType = 'json' | 'zip';

export interface Source {
  id: string;
  url: string;
  type: SourceType;
  name?: string;
  isYacht?: boolean;
  lastUpdated?: string;
  status?: 'pending' | 'success' | 'error';
  error?: string;
}

export interface App {
  id: string; // Unique ID (often sourceId + appFolderName)
  sourceId: string;
  name: string;
  description?: string;
  iconUrl?: string; // URL to the icon
  screenshots?: string[]; // URLs to screenshots
  dockerComposePath?: string; // Path relative to public/ or absolute path for reading
  dockerComposeContent?: string; // Content if from JSON
}
