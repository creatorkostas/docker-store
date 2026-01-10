import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { App } from '@/lib/types';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    if (process.env.DEBUG !== "true") {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const app: App = await request.json();
    const downloadPath = process.env.SERVER_DOWNLOAD_PATH;

    if (!downloadPath) {
      return NextResponse.json({ error: 'Server download path not configured' }, { status: 500 });
    }

    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    const safeName = app.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const appBaseDir = path.join(downloadPath, safeName);
    
    if (!fs.existsSync(appBaseDir)) {
      fs.mkdirSync(appBaseDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targetDir = path.join(appBaseDir, timestamp);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFile = path.join(targetDir, 'docker-compose.yml');
    const metadataFile = path.join(targetDir, 'app-details.json');

    let content = app.dockerComposeContent;

    if (!content && app.dockerComposePath) {
      const publicDir = path.resolve(path.join(process.cwd(), 'public'));
      // Construct the absolute path and resolve it to handle '..'
      // app.dockerComposePath is expected to be a URL path like /storage/..., so we strip leading slash
      const relativePath = app.dockerComposePath.startsWith('/') ? app.dockerComposePath.slice(1) : app.dockerComposePath;
      const requestedPath = path.resolve(path.join(publicDir, relativePath));
      
      // Strict check: requestedPath must start with publicDir
      if (requestedPath.startsWith(publicDir) && fs.existsSync(requestedPath)) {
        content = fs.readFileSync(requestedPath, 'utf-8');
      } else {
        console.warn(`Blocked potential path traversal attempt: ${app.dockerComposePath}`);
      }
    }

    if (!content) {
      return NextResponse.json({ error: 'No docker-compose content found' }, { status: 404 });
    }

    fs.writeFileSync(targetFile, content);
    fs.writeFileSync(metadataFile, JSON.stringify(app, null, 2));

    return NextResponse.json({ success: true, path: targetDir });

  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}