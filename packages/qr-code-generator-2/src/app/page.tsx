'use client';

import { useState } from 'react';
import { generateQRCode, toSVG, toPNG, ErrorCorrectionLevel } from '@/lib/qr-generator';

export default function QRCodeGenerator() {
  const [url, setUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [qrPng, setQrPng] = useState('');
  const [format, setFormat] = useState<'svg' | 'png'>('svg');

  const handleGenerate = () => {
    if (!url.trim()) return;

    try {
      const qr = generateQRCode(url, ErrorCorrectionLevel.M);
      const svg = toSVG(qr, 4);
      const png = toPNG(qr, 10, 4);
      
      setQrSvg(svg);
      setQrPng(png);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleDownload = () => {
    if (format === 'svg' && qrSvg) {
      const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qrcode.svg';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'png' && qrPng) {
      const a = document.createElement('a');
      a.href = qrPng;
      a.download = 'qrcode.png';
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            QR Code Generator
          </h1>
          <p className="text-xl text-gray-600">
            Generate QR codes from any URL - Zero dependencies, 100% client-side
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Enter URL
              </label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="https://example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Format
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setFormat('svg')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    format === 'svg'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  SVG
                </button>
                <button
                  onClick={() => setFormat('png')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    format === 'png'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  PNG
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!url.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              Generate QR Code
            </button>
          </div>
        </div>

        {(qrSvg || qrPng) && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-gray-50 p-8 rounded-xl">
                {format === 'svg' && qrSvg ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                    className="w-64 h-64"
                  />
                ) : format === 'png' && qrPng ? (
                  <img src={qrPng} alt="QR Code" className="w-64 h-64" />
                ) : null}
              </div>

              <button
                onClick={handleDownload}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
              >
                Download {format.toUpperCase()}
              </button>

              <div className="text-center text-sm text-gray-500 max-w-md">
                <p className="font-medium mb-2">✨ Features:</p>
                <ul className="space-y-1">
                  <li>🚀 Zero external dependencies</li>
                  <li>🔒 100% client-side processing</li>
                  <li>📱 Works offline</li>
                  <li>⚡ Instant generation</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

