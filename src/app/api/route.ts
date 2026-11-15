import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    service: 'QuantFoundry API',
    status: 'ok',
    health: '/api/health',
  });
}
