import { NextResponse } from 'next/server';
import { getSources } from '@/lib/sources';
import { processSource } from '@/lib/processor';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  if (process.env.DEBUG !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  }

  try {
    const { id } = await request.json();
    const sources = getSources();
    const source = sources.find(s => s.id === id);

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    await processSource(source);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
