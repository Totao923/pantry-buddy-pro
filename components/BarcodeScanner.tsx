import React, { useState, useRef, useEffect, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';
import { Ingredient } from '../types';
import { barcodeService, ProductInfo } from '../lib/services/barcodeService';

interface BarcodeScannerProps {
  onProductFound: (product: ProductInfo) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onProductFound, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startScanning = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready, then play (required for mobile browsers)
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(error => {
            console.error('Error playing video:', error);
            setError('Unable to start camera. Please try again.');
          });
        };

        setIsScanning(true);

        // Start scanning for barcodes
        scanIntervalRef.current = setInterval(() => {
          scanForBarcode();
        }, 500);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please check permissions or use manual entry.');
    }
  }, []);

  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    setIsScanning(false);
  }, []);

  const scanForBarcode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    try {
      // Use BarcodeDetector API if available (Chrome/Android)
      const barcode = await detectBarcode(canvas);

      if (barcode && barcode !== lastScannedCode) {
        setLastScannedCode(barcode);
        await handleBarcodeFound(barcode);
      }
    } catch (error) {
      console.error('Barcode scanning error:', error);
    }
  }, [isScanning, lastScannedCode]);

  const detectWithQuagga = async (canvas: HTMLCanvasElement): Promise<string | null> => {
    return new Promise(resolve => {
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        Quagga.decodeSingle(
          {
            decoder: {
              readers: [
                'ean_reader',
                'ean_8_reader',
                'code_128_reader',
                'upc_reader',
                'upc_e_reader',
              ],
            },
            locate: true,
            src: canvas.toDataURL('image/png'),
          },
          (result: any) => {
            if (result && result.codeResult) {
              resolve(result.codeResult.code);
            } else {
              resolve(null);
            }
          }
        );
      } catch (err) {
        console.error('QuaggaJS detection error:', err);
        resolve(null);
      }
    });
  };

  const detectBarcode = async (canvas: HTMLCanvasElement): Promise<string | null> => {
    try {
      // Try native BarcodeDetector API first (Chrome/Android/Edge - faster)
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        });

        const barcodes = await barcodeDetector.detect(canvas);

        if (barcodes.length > 0) {
          return barcodes[0].rawValue;
        }
      } else {
        // Fall back to QuaggaJS for Safari/iOS
        return await detectWithQuagga(canvas);
      }
    } catch (err) {
      console.error('Barcode detection error:', err);
      // Try QuaggaJS as fallback on error
      return await detectWithQuagga(canvas);
    }

    return null;
  };

  const handleBarcodeFound = async (barcode: string) => {
    setLoading(true);
    setError(null);

    try {
      const product = await barcodeService.lookupProduct(barcode);
      stopScanning();
      onProductFound(product);
    } catch (error) {
      console.error('Product lookup failed:', error);
      setError('Product not found. Try manual entry or scan another item.');
      // Continue scanning for other products
    } finally {
      setLoading(false);
    }
  };

  const handleManualLookup = async () => {
    if (!manualEntry.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const product = await barcodeService.lookupProduct(manualEntry.trim());
      onProductFound(product);
    } catch (error) {
      console.error('Manual lookup failed:', error);
      setError('Product not found. Please check the barcode and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📷</span>
            <h2 className="text-2xl font-bold text-gray-900">Scan Barcode</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {!isScanning ? (
            <div className="space-y-6">
              {/* Camera Option */}
              <div className="text-center">
                <button
                  onClick={startScanning}
                  disabled={loading}
                  className="w-full flex flex-col items-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-pantry-300 hover:bg-pantry-50 transition-all disabled:opacity-50"
                >
                  <span className="text-4xl mb-3">📸</span>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Scan with Camera</h3>
                  <p className="text-gray-600">Point your camera at a barcode to scan it</p>
                </button>
              </div>

              {/* Manual Entry */}
              <div className="space-y-4">
                <div className="text-center text-gray-500 text-sm">OR</div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Enter barcode manually
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={manualEntry}
                      onChange={e => setManualEntry(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleManualLookup()}
                      placeholder="Enter barcode number (e.g., 0123456789012)"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                      disabled={loading}
                    />
                    <button
                      onClick={handleManualLookup}
                      disabled={loading || !manualEntry.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-colors font-medium disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Lookup'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <span>💡</span>
                  Scanning Tips:
                </h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Hold the barcode steady within the camera frame</li>
                  <li>• Ensure good lighting on the barcode</li>
                  <li>• Keep the barcode flat and uncrumpled</li>
                  <li>• Try different angles if scanning isn't working</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Camera View */}
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-80 object-cover" />

                {/* Scanning Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Scanning Frame */}
                    <div className="w-64 h-32 border-2 border-white rounded-lg relative">
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse"></div>
                    </div>

                    {/* Loading Indicator */}
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        <div className="text-white text-center">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <div className="text-sm">Looking up product...</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
                    <p className="text-white text-sm">
                      {loading ? 'Processing...' : 'Align barcode within the frame'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={stopScanning}
                  disabled={loading}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Stop Scanning
                </button>
              </div>

              {/* Last Scanned */}
              {lastScannedCode && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="text-green-800 text-sm">
                    <strong>Last scanned:</strong> {lastScannedCode}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-medium">Scanning Error</span>
              </div>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
