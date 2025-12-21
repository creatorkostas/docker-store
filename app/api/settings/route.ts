import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/settings';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const settings = getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session && process.env.DEBUG !== "true") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    saveSettings(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}