import { NextResponse } from 'next/server';
import { getSources, addSource, removeSource, updateSource } from '@/lib/sources';
import { processSource } from '@/lib/processor';
import { Source } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const sources = getSources();
  return NextResponse.json(sources);
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session && process.env.DEBUG !== "true") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, url, isYacht, isCasaOS } = body;

    if (!id || !url) {
        return NextResponse.json({ error: 'ID and URL are required' }, { status: 400 });
    }

    const sources = getSources();
    const existingSource = sources.find(s => s.id === id);
    
    if (!existingSource) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const type = url.endsWith('.zip') ? 'zip' : 'json';
    const updatedSource: Source = {
        ...existingSource,
        url,
        type,
        isYacht: !!isYacht,
        isCasaOS: !!isCasaOS,
        status: 'pending',
        lastUpdated: new Date().toISOString()
    };

    updateSource(updatedSource);

    try {
        await processSource(updatedSource);
        return NextResponse.json(updatedSource);
    } catch (error: any) {
        return NextResponse.json({ ...updatedSource, status: 'error', error: error.message }, { status: 201 });
    }

  } catch (error) {
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session && process.env.DEBUG !== "true") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url, isYacht, isCasaOS } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const type = url.endsWith('.zip') ? 'zip' : 'json';
    const newSource: Source = {
      id: uuidv4(),
      url,
      type,
      isYacht: !!isYacht,
      isCasaOS: !!isCasaOS,
      status: 'pending',
      lastUpdated: new Date().toISOString()
    };

    addSource(newSource);
    
    try {
      await processSource(newSource);
      return NextResponse.json(newSource);
    } catch (error: any) {
      return NextResponse.json({ ...newSource, status: 'error', error: error.message }, { status: 201 });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session && process.env.DEBUG !== "true") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    removeSource(id);
    return NextResponse.json({ success: true });
}