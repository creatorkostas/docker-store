import fs from 'fs';
import path from 'path';

export function getLatestDeployment(appBaseDir: string): string | null {
  if (!fs.existsSync(appBaseDir)) return null;
  
  // Check if compose exists directly (legacy/root structure)
  if (fs.existsSync(path.join(appBaseDir, 'docker-compose.yml'))) {
      return appBaseDir;
  }

  // Look for subdirectories (timestamps)
  try {
      const entries = fs.readdirSync(appBaseDir, { withFileTypes: true });
      const dirs = entries
          .filter(d => d.isDirectory())
          .map(d => d.name)
          .sort() // ISO 8601 strings sort chronologically
          .reverse(); // Newest first

      for (const dir of dirs) {
          const deployPath = path.join(appBaseDir, dir);
          if (fs.existsSync(path.join(deployPath, 'docker-compose.yml'))) {
              return deployPath;
          }
      }
  } catch (e) {
      return null;
  }

  return null;
}
