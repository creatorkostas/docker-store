import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import yaml from 'js-yaml';
import { Source, App } from './types';
import { updateSource } from './sources';
import { getSettings } from './settings';

const STORAGE_DIR = path.join(process.cwd(), 'public', 'storage');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export async function processSource(source: Source): Promise<void> {
  try {
    if (source.type === 'zip') {
      await processZipSource(source);
    } else {
      // For JSON, we just verify we can fetch it. 
      // The actual app parsing happens on request or we could cache it here.
      // For now, let's just mark it as updated.
      const res = await fetch(source.url);
      if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.statusText}`);
    }

    updateSource({
      ...source,
      lastUpdated: new Date().toISOString(),
      status: 'success',
      error: undefined,
    });
  } catch (error: any) {
    console.error(`Error processing source ${source.id}:`, error);
    updateSource({
      ...source,
      lastUpdated: new Date().toISOString(),
      status: 'error',
      error: error.message,
    });
    throw error;
  }
}

async function processZipSource(source: Source) {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`Failed to download ZIP: ${response.statusText}`);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const zip = new AdmZip(buffer);

  const sourceDir = path.join(STORAGE_DIR, source.id);
  
  // Clean up old directory if exists
  if (fs.existsSync(sourceDir)) {
    fs.rmSync(sourceDir, { recursive: true, force: true });
  }
  
  // Create temp dir for extraction
  const tempDir = path.join(STORAGE_DIR, `${source.id}_temp`);
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  zip.extractAllTo(tempDir, true);

  // Find "Apps" folder
  // It could be at root, or nested inside a top-level folder (common in GitHub archives)
  let appsDir = path.join(tempDir, 'Apps');
  
  if (!fs.existsSync(appsDir)) {
    // Search recursively one level deep
    const entries = fs.readdirSync(tempDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const potentialApps = path.join(tempDir, entry.name, 'Apps');
        if (fs.existsSync(potentialApps)) {
          appsDir = potentialApps;
          break;
        }
      }
    }
  }

  if (fs.existsSync(appsDir)) {
    // Move Apps to final location
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.cpSync(appsDir, sourceDir, { recursive: true });
  } else {
    throw new Error('No "Apps" folder found in the ZIP file.');
  }

  // Cleanup temp
  fs.rmSync(tempDir, { recursive: true, force: true });
}

export async function getAllApps(sources: Source[]): Promise<App[]> {
  let allApps: App[] = [];
  
  // Fetch settings once for the batch
  const settings = getSettings();
  const yachtDefaults = settings.yacht;

  for (const source of sources) {
    if (source.status !== 'success') continue;

    if (source.type === 'zip') {
      const sourcePath = path.join(STORAGE_DIR, source.id);
      if (fs.existsSync(sourcePath)) {
        const appFolders = fs.readdirSync(sourcePath, { withFileTypes: true });
        
        for (const dirent of appFolders) {
          if (!dirent.isDirectory()) continue;
          
          const appName = dirent.name;
          const appPath = path.join(sourcePath, appName);
          
          // Look for docker-compose
          const composeFiles = ['docker-compose.yml', 'docker-compose.yaml'];
          let composeFile = composeFiles.find(f => fs.existsSync(path.join(appPath, f)));
          
          if (composeFile) {
             // Look for icon (png, jpg, svg)
             const files = fs.readdirSync(appPath);
             const iconFile = files.find(f => /\.(png|jpg|jpeg|svg|webp)$/i.test(f));
             
             // Look for README
             const readmeFile = files.find(f => /^readme(\.(md|txt|markdown))?$/i.test(f));
             let description: string | undefined;
             if (readmeFile) {
               try {
                 description = fs.readFileSync(path.join(appPath, readmeFile), 'utf-8');
               } catch (e) {
                 console.error(`Error reading readme for ${appName}`, e);
               }
             }

             // Look for screenshots
             const screenshotFiles = files.filter(f => /^screenshot-\d+\.(png|jpg|jpeg|webp)$/i.test(f));
             screenshotFiles.sort((a, b) => {
                const numA = parseInt(a.match(/(\d+)/)?.[0] || '0');
                const numB = parseInt(b.match(/(\d+)/)?.[0] || '0');
                return numA - numB;
             });
             
             // Base URL for serving static files
             // We need to serve these via Next.js public folder.
             // Since we save to public/storage, they are accessible at /storage/...
             const publicPath = `/storage/${source.id}/${appName}`;

             allApps.push({
               id: `${source.id}-${appName}`,
               sourceId: source.id,
               name: appName, // Could try to read name from compose labels or a metadata file if exists
               description,
               iconUrl: iconFile ? `${publicPath}/${iconFile}` : undefined,
               screenshots: screenshotFiles.map(f => `${publicPath}/${f}`),
               dockerComposePath: `${publicPath}/${composeFile}`,
               // We can also read the content now if needed, but path is good for download
             });
          }
        }
      }
    } else if (source.type === 'json') {
      try {
        const res = await fetch(source.url);
        if (res.ok) {
           const data = await res.json();
           
           if (source.isYacht && Array.isArray(data)) {
               allApps = allApps.concat(data.map((item: any) => {
                   // Generate Docker Compose
                   const service: any = {
                       image: item.image,
                       restart: item.restart_policy || 'unless-stopped',
                   }
                   
                   // Ports
                   if (item.ports) {
                       service.ports = item.ports.map((p: any) => {
                           if (typeof p === 'string') return p;
                           if (typeof p === 'object') return Object.values(p)[0];
                           return null;
                       }).filter(Boolean);
                   }
                   
                   // Volumes
                   if (item.volumes) {
                       service.volumes = item.volumes.map((v: any) => {
                           let hostPath = v.bind;
                           
                           // Check against Yacht settings
                           if (hostPath && typeof hostPath === 'string') {
                               if (yachtDefaults[hostPath]) {
                                   hostPath = yachtDefaults[hostPath];
                               } else if (hostPath.startsWith('!')) {
                                   // Fallback if not in settings but starts with !
                                   hostPath = './' + hostPath.substring(1);
                               }
                           }
                           
                           return `${hostPath}:${v.container}`;
                       });
                   }
                   
                   // Env
                   if (item.env) {
                       service.environment = {};
                       item.env.forEach((e: any) => {
                           // Use default if available
                           let val = e.default || "";
                           
                           // Check if default value is a variable we have a setting for
                           if (val && typeof val === 'string' && yachtDefaults[val]) {
                               val = yachtDefaults[val];
                           }
                           
                           service.environment[e.name] = val;
                       });
                   }

                   const composeObj = {
                       version: '3',
                       services: {
                           [item.name]: service
                       }
                   };

                   return {
                       id: `${source.id}-${item.name}`,
                       sourceId: source.id,
                       name: item.title || item.name,
                       description: item.description,
                       iconUrl: item.logo,
                       dockerComposeContent: yaml.dump(composeObj)
                   };
               }));
           } else if (Array.isArray(data)) {
             allApps = allApps.concat(data.map((item: any) => ({
               id: uuidv4(), // or item.id
               sourceId: source.id,
               name: item.name || 'Unknown',
               description: item.description,
               iconUrl: item.icon || item.image,
               dockerComposeContent: item.docker_compose || item.compose, // Assuming content is provided directly
             })));
           }
        }
      } catch (e) {
        console.error(`Error fetching apps from JSON source ${source.id}`, e);
      }
    }
  }

  return allApps;
}