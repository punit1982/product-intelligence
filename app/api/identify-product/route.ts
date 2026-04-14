import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

async function identifyFromImage(imageBase64: string): Promise<{
  productName: string;
  visibleInfo: string;
  confidence: number;
}> {
  try {
    console.log('[Claude Vision] Starting image identification...');
    console.log('[Claude Vision] Image size:', imageBase64.length, 'bytes');
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment');
    }

    const client = new Anthropic({ 
      apiKey,
      timeout: 30000, // 30 second timeout
    });
    
    console.log('[Claude Vision] Making API call to Claude 3.5 Sonnet...');
    
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
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
              text: `Identify the product in this image. Return ONLY valid JSON (no markdown):
{"productName": "exact product name with brand and size if visible", "visibleInfo": "any visible text on packaging", "confidence": 0.85}`,
            },
          ],
        },
      ],
    });

    console.log('[Claude Vision] Response received successfully');

    const content = response.content[0];
    if (content.type === 'text') {
      console.log('[Claude Vision] Raw response:', content.text.substring(0, 200));
      
      try {
        const parsed = JSON.parse(content.text);
        console.log('[Claude Vision] Parsed successfully:', parsed.productName);
        
        return {
          productName: parsed.productName || 'Unknown Product',
          visibleInfo: parsed.visibleInfo || '',
          confidence: Math.min(parsed.confidence || 0.85, 1.0),
        };
      } catch (parseError) {
        console.error('[Claude Vision] JSON parse error:', parseError);
        // If JSON parsing fails, try to extract product name from the text
        const text = content.text;
        if (text.includes('productName')) {
          const match = text.match(/"productName"\s*:\s*"([^"]+)"/);
          if (match && match[1]) {
            return {
              productName: match[1],
              visibleInfo: '',
              confidence: 0.7,
            };
          }
        }
        throw new Error('Could not parse Claude response: ' + content.text);
      }
    }
    
    throw new Error('Unexpected response type from Claude Vision');
  } catch (error) {
    console.error('[Claude Vision Error]:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/identify-product called');
    
    const body = await request.json();
    const { imageBase64, productName } = body;

    console.log('[API] Received - imageBase64 length:', imageBase64 ? imageBase64.length : 0, 'productName:', productName);

    let identifiedProduct = '';
    let visibleInfo = '';
    let confidence = 0;

    // If image provided, identify using Claude Vision
    if (imageBase64) {
      console.log('[API] Processing image with Claude Vision...');
      
      // Check image size (max 5MB for Claude)
      if (imageBase64.length > 5242880) {
        throw new Error('Image too large. Maximum size is 5MB.');
      }
      
      const result = await identifyFromImage(imageBase64);
      identifiedProduct = result.productName;
      visibleInfo = result.visibleInfo;
      confidence = result.confidence;
      
      console.log('[API] Image identification successful:', identifiedProduct);
    }

    // Use provided product name or identified product
    const finalProductName = productName || identifiedProduct;

    console.log('[API] Final product name:', finalProductName);

    if (!finalProductName) {
      return NextResponse.json(
        { error: 'Could not identify product. Try uploading a clearer image or enter product name manually.' },
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
    
    // Return specific error messages
    let userMessage = 'Failed to identify product';
    if (msg.includes('API')) userMessage = 'Claude Vision API error - check your API key';
    if (msg.includes('timeout')) userMessage = 'Request timed out - try again';
    if (msg.includes('size')) userMessage = msg;
    
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
