import { NextResponse } from 'next/server';
import { getSources } from '@/lib/sources';
import { processSource } from '@/lib/processor';

export async function POST(request: Request) {
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
