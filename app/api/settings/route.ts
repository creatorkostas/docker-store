import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/settings';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const settings = getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  console.log("Settings POST request received. DEBUG env var:", process.env.DEBUG);
  try {
    if (process.env.DEBUG !== "true") {
      console.log("Checking session...");
      const session = await getServerSession(authOptions);
      if (!session) {
          console.log("Unauthorized access attempt");
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.log("Session verified");
    } else {
      console.log("Skipping session check due to DEBUG=true");
    }

    const body = await request.json();
    console.log("Saving settings body:", JSON.stringify(body));
    saveSettings(body);
    console.log("Settings saved successfully");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving settings - Full Error Object:", error);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    return NextResponse.json({ error: 'Failed to save settings', details: error.message }, { status: 500 });
  }
}