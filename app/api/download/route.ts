import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { App } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const app: App = await request.json();
    const downloadPath = process.env.SERVER_DOWNLOAD_PATH;

    if (!downloadPath) {
      return NextResponse.json({ error: 'Server download path not configured' }, { status: 500 });
    }

    // Ensure download directory exists
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    const targetDir = path.join(downloadPath, app.name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFile = path.join(targetDir, 'docker-compose.yml');

    let content = app.dockerComposeContent;

    if (!content && app.dockerComposePath) {
      // It's a file on the server (from ZIP extraction)
      // app.dockerComposePath is a URL path like /storage/..., we need local file path
      // logic in processor.ts set it to /storage/..., which maps to public/storage/...
      // so we construct local path:
      const relativePath = app.dockerComposePath.startsWith('/') ? app.dockerComposePath.slice(1) : app.dockerComposePath;
      const localPath = path.join(process.cwd(), 'public', relativePath);
      
      if (fs.existsSync(localPath)) {
        content = fs.readFileSync(localPath, 'utf-8');
      }
    }

    if (!content) {
      return NextResponse.json({ error: 'No docker-compose content found' }, { status: 404 });
    }

    fs.writeFileSync(targetFile, content);

    return NextResponse.json({ success: true, path: targetFile });

  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
