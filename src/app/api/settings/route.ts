import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: 'default' } });
  }
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const settings = await prisma.settings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      llmProvider: body.llmProvider,
      llmApiKey: body.llmApiKey,
      webSearchEnabled: body.webSearchEnabled ?? false,
      defaultMaxTouchpoints: body.defaultMaxTouchpoints,
      defaultIntervalDays: body.defaultIntervalDays,
    },
    update: {
      llmProvider: body.llmProvider,
      llmApiKey: body.llmApiKey,
      webSearchEnabled: body.webSearchEnabled ?? false,
      defaultMaxTouchpoints: body.defaultMaxTouchpoints,
      defaultIntervalDays: body.defaultIntervalDays,
    },
  });
  return NextResponse.json(settings);
}
