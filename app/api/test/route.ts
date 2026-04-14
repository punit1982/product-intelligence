import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const hasKey = !!apiKey;
    const keyPreview = apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}` : 'NOT SET';

    return NextResponse.json({
      status: 'ok',
      hasApiKey: hasKey,
      keyPreview: keyPreview,
      nodeEnv: process.env.NODE_ENV,
      message: hasKey ? 'API key is accessible' : 'API key is NOT set in environment variables',
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: String(error),
    });
  }
}
