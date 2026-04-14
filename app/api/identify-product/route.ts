import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

async function identifyFromImage(imageBase64: string): Promise<{
  productName: string;
  visibleInfo: string;
  confidence: number;
}> {
  try {
    console.log('[Claude Vision] Initializing client...');
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment');
    }

    const client = new Anthropic({ apiKey });
    
    console.log('[Claude Vision] Making API call...');
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Identify this product precisely. Return ONLY a JSON response:
{"productName": "product with brand and size", "visibleInfo": "visible text", "confidence": 0.95}`,
            },
          ],
        },
      ],
    });

    console.log('[Claude Vision] Response received');
    const content = response.content[0];
    
    if (content.type === 'text') {
      const parsed = JSON.parse(content.text);
      return {
        productName: parsed.productName || 'Unknown Product',
        visibleInfo: parsed.visibleInfo || '',
        confidence: parsed.confidence || 0.9,
      };
    }
    
    throw new Error('Invalid response format from Claude');
  } catch (error) {
    console.error('[Claude Vision Error]:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, productName } = body;

    let identifiedProduct = '';
    let visibleInfo = '';
    let confidence = 0;

    if (imageBase64) {
      const result = await identifyFromImage(imageBase64);
      identifiedProduct = result.productName;
      visibleInfo = result.visibleInfo;
      confidence = result.confidence;
    }

    const finalProductName = productName || identifiedProduct;

    if (!finalProductName) {
      return NextResponse.json(
        { error: 'Could not identify product. Enter product name manually.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      productName: finalProductName,
      visibleInfo,
      confidence: confidence || (imageBase64 ? 0.9 : 0.85),
      source: imageBase64 ? 'claude-vision' : 'manual-input',
    });
  } catch (error) {
    console.error('[API Error]:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed: ${msg}` },
      { status: 500 }
    );
  }
}
