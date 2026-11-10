import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    // If CRON_SECRET is configured, enforce token authorization
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
      }
    }

    const timestamp = new Date().toISOString();

    // Cron heartbeat response
    return NextResponse.json({
      success: true,
      timestamp,
      message: 'Life OS reminder scheduler heartbeat executed successfully',
      environment: process.env.NODE_ENV,
      status: 'active',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error executing reminder cron' },
      { status: 500 }
    );
  }
}
