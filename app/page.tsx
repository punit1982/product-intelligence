'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface AttributeValue {
  value: any;
  confidence: number;
  source: string;
}

interface AttributeResult {
  category: string;
  attributes: Record<string, AttributeValue>;
}

interface ScrapeResult {
  product_name: string;
  scraped_at: string;
  categories: AttributeResult[];
}

export default function Home() {
  const [productName, setProductName] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setImageBase64(base64);
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const identifyRes = await fetch('/api/identify-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, productName }),
      });

      if (!identifyRes.ok) throw new Error('Failed to identify product');

      const identified = await identifyRes.json();
      const finalProductName = identified.productName;
      const visibleInfo = identified.visibleInfo;

      const scrapeRes = await fetch('/api/scrape-attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: finalProductName,
          visibleInfo: visibleInfo,
        }),
      });

      if (!scrapeRes.ok) throw new Error('Failed to scrape attributes');

      const scrapeData = await scrapeRes.json();
      setResults(scrapeData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred. Check console.'
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Product Intelligence
          </h1>
          <p className="text-lg text-gray-600">
            Extract comprehensive attributes from FMCG & Consumer Durables
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Product Image
              </label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Upload Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {imagePreview && (
                  <div className="relative w-20 h-20">
                    <Image
                      src={imagePreview}
                      alt="preview"
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Name / SKU
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Coca-Cola 500ml, iPhone 15 Pro"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Or upload an image to auto-identify
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || (!productName && !imageBase64)}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Searching & Scraping...' : 'Get All Attributes'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}
        </div>

        {results && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {results.product_name}
              </h2>
              <p className="text-sm text-gray-500">
                Scraped at {new Date(results.scraped_at).toLocaleString()}
              </p>
            </div>

            {results.categories.map((category, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-lg p-8">
                <h3 className="text-xl font-bold text-indigo-900 mb-6 border-b-2 border-indigo-200 pb-3">
                  {category.category}
                </h3>

                {Object.keys(category.attributes).length === 0 ? (
                  <p className="text-gray-500 italic">No data found for this category</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(category.attributes).map(
                      ([key, attr]) => (
                        <div key={key} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-gray-900 capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span
                              className={`text-xs font-bold ${getConfidenceColor(
                                attr.confidence
                              )}`}
                            >
                              {Math.round(attr.confidence * 100)}%
                            </span>
                          </div>

                          <p className="text-gray-700 mb-2 break-words">
                            {Array.isArray(attr.value)
                              ? attr.value.join(', ')
                              : String(attr.value)}
                          </p>

                          <p className="text-xs text-gray-500">
                            Source: <span className="font-mono">{attr.source}</span>
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
