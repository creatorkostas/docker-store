import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLatestDeployment } from "@/lib/server-utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session && process.env.DEBUG !== "true") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const downloadPath = process.env.SERVER_DOWNLOAD_PATH;
  if (!downloadPath || !fs.existsSync(downloadPath)) {
    return NextResponse.json([]);
  }

  try {
    const entries = fs.readdirSync(downloadPath, { withFileTypes: true });
    const apps = entries
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
          const appBaseDir = path.join(downloadPath, dirent.name);
          const deployPath = getLatestDeployment(appBaseDir);
          
          let details = {};
          if (deployPath) {
              try {
                  const detailsPath = path.join(deployPath, 'app-details.json');
                  if (fs.existsSync(detailsPath)) {
                      details = JSON.parse(fs.readFileSync(detailsPath, 'utf-8'));
                  }
              } catch (e) {}
          }

          return {
              name: dirent.name,
              path: appBaseDir, // Return base dir, logic will find latest inside
              valid: !!deployPath,
              ...details
          };
      });
    return NextResponse.json(apps);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list apps' }, { status: 500 });
  }
}
