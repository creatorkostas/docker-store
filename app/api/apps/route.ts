import { NextResponse } from 'next/server';
import { getSources } from '@/lib/sources';
import { getAllApps } from '@/lib/processor';

export async function GET() {
  const sources = getSources();
  const apps = await getAllApps(sources);
  return NextResponse.json(apps);
}
