import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import yaml from 'js-yaml';
import { Source, App } from './types';
import { updateSource } from './sources';
import { getSettings } from './settings';

import { isSafeUrl } from './utils';

const STORAGE_DIR = path.join(process.cwd(), 'public', 'storage');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export async function processSource(source: Source): Promise<void> {
  // Validate URL to prevent SSRF
  if (!isSafeUrl(source.url)) {
      const errorMsg = `Invalid or unsafe URL: ${source.url}`;
      console.error(errorMsg);
      updateSource({
        ...source,
        lastUpdated: new Date().toISOString(),
        status: 'error',
        error: errorMsg,
      });
      return;
  }

  try {
    if (source.type === 'zip') {
      await processZipSource(source);
    } else {
      // For JSON, we just verify we can fetch it. 
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
  
  // DoS Protection: Limit file size to 50MB
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  if (arrayBuffer.byteLength > MAX_SIZE) {
      throw new Error(`File too large. Max size is ${MAX_SIZE / 1024 / 1024}MB`);
  }

  const buffer = Buffer.from(arrayBuffer);
  const zip = new AdmZip(buffer);

  const sourceDir = path.join(STORAGE_DIR, source.id);
  
  if (fs.existsSync(sourceDir)) {
    fs.rmSync(sourceDir, { recursive: true, force: true });
  }
  
  const tempDir = path.join(STORAGE_DIR, `${source.id}_temp`);
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  // Secure extraction to prevent Zip Slip
  zip.getEntries().forEach((entry) => {
    const entryName = entry.entryName;
    const destination = path.join(tempDir, entryName);
    
    // Security check: Ensure the resolved path is within the target directory
    const relative = path.relative(tempDir, destination);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      console.warn(`Skipping potentially unsafe zip entry: ${entryName}`);
      return;
    }

    if (entry.isDirectory) {
        fs.mkdirSync(destination, { recursive: true });
    } else {
        const parent = path.dirname(destination);
        if (!fs.existsSync(parent)) {
            fs.mkdirSync(parent, { recursive: true });
        }
        fs.writeFileSync(destination, entry.getData());
    }
  });

  // Find "Apps" folder
  let appsDir = path.join(tempDir, 'Apps');
  
  if (!fs.existsSync(appsDir)) {
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
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.cpSync(appsDir, sourceDir, { recursive: true });
  } else {
    throw new Error('No "Apps" folder found in the ZIP file.');
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
}

export async function getAllApps(sources: Source[]): Promise<App[]> {
  let allApps: App[] = [];
  
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
          
          const composeFiles = ['docker-compose.yml', 'docker-compose.yaml'];
          let composeFile = composeFiles.find(f => fs.existsSync(path.join(appPath, f)));
          
          if (composeFile) {
             const publicPath = `/storage/${source.id}/${appName}`;

             // CasaOS Specific Processing
             if (source.isCasaOS) {
                 try {
                     const content = fs.readFileSync(path.join(appPath, composeFile), 'utf-8');
                     const parsed: any = yaml.load(content);

                     if (parsed) {
                         const metadata = parsed['x-casaos'] || {};
                         
                         let name = appName;
                         if (metadata.title) {
                             name = typeof metadata.title === 'object' ? (metadata.title.en_us || Object.values(metadata.title)[0]) : metadata.title;
                         }
                         
                         let description = undefined;
                         // Try description, then tagline
                         const descObj = metadata.description || metadata.tagline;
                         if (descObj) {
                            description = typeof descObj === 'object' ? (descObj.en_us || Object.values(descObj)[0]) : descObj;
                         }

                         let iconUrl = undefined;
                         if (metadata.icon) {
                             if (metadata.icon.startsWith('http')) {
                                 iconUrl = metadata.icon;
                             } else {
                                 // Ensure no leading slash in metadata.icon if we append
                                 const cleanIcon = metadata.icon.startsWith('/') ? metadata.icon.slice(1) : metadata.icon;
                                 iconUrl = `${publicPath}/${cleanIcon}`;
                             }
                         }

                         let screenshots: string[] = [];
                         if (metadata.screenshot_link && Array.isArray(metadata.screenshot_link)) {
                              screenshots = metadata.screenshot_link.map((s: string) => {
                                  if (s.startsWith('http')) return s;
                                  const cleanS = s.startsWith('/') ? s.slice(1) : s;
                                  return `${publicPath}/${cleanS}`;
                              });
                         }

                         // Clean YAML and normalize volumes
                         delete parsed['x-casaos'];
                         if (parsed.services) {
                             for (const svc in parsed.services) {
                                 const service = parsed.services[svc];
                                 
                                 // Convert long volume syntax to short syntax
                                 if (service.volumes && Array.isArray(service.volumes)) {
                                     service.volumes = service.volumes.map((v: any) => {
                                         if (typeof v === 'object' && v.type === 'bind' && v.source && v.target) {
                                             return `${v.source}:${v.target}`;
                                         }
                                         return v;
                                     });
                                 }

                                 delete service['x-casaos'];
                             }
                         }
                         const cleanedYaml = yaml.dump(parsed);

                         allApps.push({
                             id: `${source.id}-${appName}`,
                             sourceId: source.id,
                             name: name || appName,
                             description: description,
                             iconUrl: iconUrl,
                             screenshots: screenshots,
                             dockerComposeContent: cleanedYaml,
                         });
                         continue; 
                     }
                 } catch (e) {
                     console.error(`Error processing CasaOS app ${appName}`, e);
                 }
             }

             // Standard ZIP Processing
             const files = fs.readdirSync(appPath);
             const iconFile = files.find(f => /\.(png|jpg|jpeg|svg|webp)$/i.test(f));
             
             const readmeFile = files.find(f => /^readme(\.(md|txt|markdown))?$/i.test(f));
             let description: string | undefined;
             if (readmeFile) {
               try {
                 description = fs.readFileSync(path.join(appPath, readmeFile), 'utf-8');
               } catch (e) {
                 console.error(`Error reading readme for ${appName}`, e);
               }
             }

             const screenshotFiles = files.filter(f => /^screenshot-\d+\.(png|jpg|jpeg|webp)$/i.test(f));
             screenshotFiles.sort((a, b) => {
                const numA = parseInt(a.match(/(\d+)/)?.[0] || '0');
                const numB = parseInt(b.match(/(\d+)/)?.[0] || '0');
                return numA - numB;
             });
             
             allApps.push({
               id: `${source.id}-${appName}`,
               sourceId: source.id,
               name: appName,
               description,
               iconUrl: iconFile ? `${publicPath}/${iconFile}` : undefined,
               screenshots: screenshotFiles.map(f => `${publicPath}/${f}`),
               dockerComposePath: `${publicPath}/${composeFile}`,
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
                           
                           if (hostPath && typeof hostPath === 'string') {
                               if (yachtDefaults[hostPath]) {
                                   hostPath = yachtDefaults[hostPath];
                               } else if (hostPath.startsWith('!')) {
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
                           let val = e.default || "";
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
               id: uuidv4(),
               sourceId: source.id,
               name: item.name || 'Unknown',
               description: item.description,
               iconUrl: item.icon || item.image,
               dockerComposeContent: item.docker_compose || item.compose, 
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
