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
  const session = await getServerSession(authOptions);
  if (!session && process.env.DEBUG !== "true") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await context.params;
  const { deleteImages, deleteVolumes } = await request.json();
  const downloadPath = process.env.SERVER_DOWNLOAD_PATH;

  if (!downloadPath) return NextResponse.json({ error: 'Configuration error' }, { status: 500 });

  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const appBaseDir = path.join(downloadPath, safeName);
  
  // We need the compose file to run 'down'
  const deployPath = getLatestDeployment(appBaseDir);
  
  if (deployPath) {
      const composeFile = path.join(deployPath, 'docker-compose.yml');
      const projectName = safeName.toLowerCase();
      
      let command = `docker compose -p "${projectName}" -f "${composeFile}" down --remove-orphans`;
      
      if (deleteImages) command += ' --rmi all';
      if (deleteVolumes) command += ' --volumes';

      try {
          console.log(`Executing: ${command}`);
          await execAsync(command);
      } catch (error: any) {
          console.error('Docker down failed:', error);
          // We continue to delete files even if docker down fails (e.g. if containers are already gone)
          // But we might want to warn the user? For now, proceed to cleanup.
      }
  }

  // Delete the application directory (including all versions)
  try {
      if (fs.existsSync(appBaseDir)) {
          fs.rmSync(appBaseDir, { recursive: true, force: true });
      }
      return NextResponse.json({ success: true });
  } catch (error: any) {
      return NextResponse.json({ error: 'Failed to delete application files', details: error.message }, { status: 500 });
  }
}
