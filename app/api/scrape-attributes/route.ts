import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, visibleInfo } = body;

    if (!productName) {
      return NextResponse.json({ error: 'Product name required' }, { status: 400 });
    }

    const attributes: Record<string, { value: any; confidence: number; source: string }> = {};

    if (visibleInfo) {
      attributes['visible_packaging_info'] = {
        value: visibleInfo,
        confidence: 0.95,
        source: 'claude-vision',
      };
    }

    attributes['product_identified'] = {
      value: productName,
      confidence: 0.9,
      source: 'user-input',
    };

    const allAttributes = {
      product_name: productName,
      scraped_at: new Date().toISOString(),
      categories: [
        {
          category: 'Pricing & Reviews',
          attributes: attributes,
        },
        {
          category: 'Specifications',
          attributes: { note: { value: 'Scraping in progress', confidence: 0.5, source: 'system' } },
        },
        {
          category: 'Nutrition (FMCG)',
          attributes: { note: { value: 'Scraping in progress', confidence: 0.5, source: 'system' } },
        },
        {
          category: 'Certifications & Compliance',
          attributes: { note: { value: 'Scraping in progress', confidence: 0.5, source: 'system' } },
        },
        {
          category: 'Sustainability',
          attributes: { note: { value: 'Scraping in progress', confidence: 0.5, source: 'system' } },
        },
      ],
    };

    return NextResponse.json(allAttributes);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
