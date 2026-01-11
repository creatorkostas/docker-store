import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLatestDeployment } from "@/lib/server-utils";

export async function POST(request: Request, context: { params: Promise<{ name: string }> }) {
  if (process.env.DEBUG !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  }

  const { name } = await context.params;
  const { action } = await request.json();
  const downloadPath = process.env.SERVER_DOWNLOAD_PATH;

  if (!downloadPath) return NextResponse.json({ error: 'Configuration error' }, { status: 500 });

  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const appBaseDir = path.join(downloadPath, safeName);
  const deployPath = getLatestDeployment(appBaseDir);

  if (!deployPath) {
      return NextResponse.json({ error: 'App deployment not found' }, { status: 404 });
  }

  const composeFile = path.join(deployPath, 'docker-compose.yml');

  if (!['up', 'down', 'restart', 'stop', 'start'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const projectName = safeName.toLowerCase();
  const args = ['compose', '-p', projectName, '-f', composeFile, action];
  
  if (action === 'up') {
      args.push('-d');
  }

  return new Promise<NextResponse>((resolve) => {
      const child = spawn('docker', args);
      
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
          if (code === 0) {
              resolve(NextResponse.json({ success: true, output: stdout, error: stderr }));
          } else {
              resolve(NextResponse.json({ error: 'Command failed', details: stderr || stdout }, { status: 500 }));
          }
      });
      
      child.on('error', (err) => {
           resolve(NextResponse.json({ error: 'Spawn failed', details: err.message }, { status: 500 }));
      });
  });
}
