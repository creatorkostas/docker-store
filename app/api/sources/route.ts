import { NextResponse } from 'next/server';
import { getSources, addSource, removeSource } from '@/lib/sources';
import { processSource } from '@/lib/processor';
import { Source } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const sources = getSources();
  return NextResponse.json(sources);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, isYacht } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const type = url.endsWith('.zip') ? 'zip' : 'json';
    const newSource: Source = {
      id: uuidv4(),
      url,
      type,
      isYacht: !!isYacht,
      status: 'pending',
      lastUpdated: new Date().toISOString()
    };

    addSource(newSource);
    
    // Process immediately
    // In a real app, might want to use a queue, but await is fine here
    try {
      await processSource(newSource);
      return NextResponse.json(newSource);
    } catch (error: any) {
      // Even if processing fails, we added the source. 
      // The frontend should show the error state.
      return NextResponse.json({ ...newSource, status: 'error', error: error.message }, { status: 201 });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    removeSource(id);
    return NextResponse.json({ success: true });
}
