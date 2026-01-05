import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLatestDeployment } from "@/lib/server-utils";

const execAsync = promisify(exec);

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

  let command = '';
  // Ensure we use the correct project name to avoid conflict if user downloaded multiple versions?
  // Docker Compose usually uses directory name as project name.
  // If we are in "timestamp" dir, project name will comprise timestamp.
  // If we want a stable project name (e.g. "AppName"), we should specify -p.
  // For now, let's keep default behavior (directory name) to allow parallel testing of versions if needed, 
  // or add -p safeName to enforce single instance per app name.
  // Enforcing single instance per app name is safer for "Up".
  const projectName = safeName.toLowerCase();
  const baseCmd = `docker compose -p "${projectName}" -f "${composeFile}"`;

  switch (action) {
      case 'up':
          command = `${baseCmd} up -d`;
          break;
      case 'down':
          command = `${baseCmd} down`;
          break;
      case 'restart':
          command = `${baseCmd} restart`;
          break;
      case 'stop':
          command = `${baseCmd} stop`;
          break;
      case 'start':
          command = `${baseCmd} start`;
          break;
  }

  try {
      const { stdout, stderr } = await execAsync(command);
      return NextResponse.json({ success: true, output: stdout, error: stderr });
  } catch (error: any) {
      return NextResponse.json({ error: 'Command failed', details: error.message }, { status: 500 });
  }
}
