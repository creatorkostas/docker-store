import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLatestDeployment } from "@/lib/server-utils";

export async function GET(request: Request, context: { params: Promise<{ name: string }> }) {
  if (process.env.DEBUG !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  }

  const { name } = await context.params;
  const downloadPath = process.env.SERVER_DOWNLOAD_PATH;
  
  if (!downloadPath) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
  }

  // Sanitize name to prevent directory traversal
  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const appBaseDir = path.join(downloadPath, safeName);
  const deployPath = getLatestDeployment(appBaseDir);

  if (!deployPath) {
      return NextResponse.json({ error: 'App deployment not found' }, { status: 404 });
  }

  const composeFile = path.join(deployPath, 'docker-compose.yml');

  try {
      const content = fs.readFileSync(composeFile, 'utf-8');
      return NextResponse.json({ content });
  } catch (error) {
      return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ name: string }> }) {
  if (process.env.DEBUG !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  }

  const { name } = await context.params;
  const { content } = await request.json();
  const downloadPath = process.env.SERVER_DOWNLOAD_PATH;

  if (!downloadPath) return NextResponse.json({ error: 'Configuration error' }, { status: 500 });

  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const appBaseDir = path.join(downloadPath, safeName);
  const deployPath = getLatestDeployment(appBaseDir);

  if (!deployPath) {
      return NextResponse.json({ error: 'App deployment not found' }, { status: 404 });
  }

  const composeFile = path.join(deployPath, 'docker-compose.yml');

  try {
      fs.writeFileSync(composeFile, content);
      return NextResponse.json({ success: true });
  } catch (error) {
      return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}
