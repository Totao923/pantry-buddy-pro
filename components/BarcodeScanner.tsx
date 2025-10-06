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
  const [cameraInitializing, setCameraInitializing] = useState(false);
  const [manualEntry, setManualEntry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanAttempts, setScanAttempts] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startScanning = useCallback(async () => {
    console.log('🎥 [iOS Debug] Starting camera...');
    setError(null);

    // Show camera view immediately so video element is mounted
    setCameraInitializing(true);
    setIsScanning(true);

    // Use setTimeout to ensure DOM updates before accessing video element
    setTimeout(async () => {
      try {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('🎥 [iOS Debug] getUserMedia not supported');
          setError('Camera access not supported on this device. Please use manual entry.');
          setIsScanning(false);
          setCameraInitializing(false);
          return;
        }

        console.log('🎥 [iOS Debug] Requesting camera permission...');

        // Try to get back camera first, fallback to any camera if not available
        let stream: MediaStream | null = null;
        try {
          // Try with back camera (environment)
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (err) {
          console.log('🎥 [iOS Debug] Back camera not available, trying any camera...');
          // Fallback to any available camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        }

        console.log('🎥 [iOS Debug] Camera permission granted, stream received:', stream.id);
        streamRef.current = stream;

        if (videoRef.current) {
          console.log('🎥 [iOS Debug] Setting video source...');
          videoRef.current.srcObject = stream;

          // Wait for video to be ready, then play (required for mobile browsers)
          videoRef.current.onloadedmetadata = () => {
            console.log('🎥 [iOS Debug] Video metadata loaded, attempting to play...');
            videoRef.current
              ?.play()
              .then(() => {
                console.log('🎥 [iOS Debug] Video playing successfully!');
                setCameraInitializing(false);

                // Start scanning for barcodes - reduced interval for faster detection
                scanIntervalRef.current = setInterval(() => {
                  scanForBarcode();
                }, 300);
              })
              .catch(error => {
                console.error('🎥 [iOS Debug] Error playing video:', error);
                setError('Unable to start camera playback. Please try again.');
                setIsScanning(false);
                setCameraInitializing(false);
              });
          };

          videoRef.current.onerror = error => {
            console.error('🎥 [iOS Debug] Video element error:', error);
            setError('Video playback error. Please try again.');
            setIsScanning(false);
            setCameraInitializing(false);
          };
        } else {
          console.error('🎥 [iOS Debug] Video ref is null!');
          setError('Camera initialization failed. Please try again.');
          setIsScanning(false);
          setCameraInitializing(false);
        }
      } catch (error) {
        console.error('🎥 [iOS Debug] Error accessing camera:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('🎥 [iOS Debug] Error details:', errorMessage);

        if (
          errorMessage.includes('Permission denied') ||
          errorMessage.includes('NotAllowedError')
        ) {
          setError(
            'Camera permission denied. Please allow camera access in your browser settings and try again.'
          );
        } else if (errorMessage.includes('NotFoundError')) {
          setError('No camera found on this device. Please use manual entry.');
        } else {
          setError(`Unable to access camera: ${errorMessage}. Please try manual entry.`);
        }
        setIsScanning(false);
        setCameraInitializing(false);
      }
    }, 100);
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
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      console.log('🎥 [iOS Debug] scanForBarcode skipped - missing refs or not scanning');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.log('🎥 [iOS Debug] Video not ready yet, readyState:', video.readyState);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    try {
      // Update scan attempts counter
      setScanAttempts(prev => prev + 1);

      // Use BarcodeDetector API if available (Chrome/Android)
      const barcode = await detectBarcode(canvas);

      if (barcode && barcode !== lastScannedCode) {
        console.log('🎥 [iOS Debug] ✅ Barcode detected:', barcode);
        setLastScannedCode(barcode);
        await handleBarcodeFound(barcode);
      }
    } catch (error) {
      console.error('🎥 [iOS Debug] Barcode scanning error:', error);
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

        console.log('🎥 [iOS Debug] Using QuaggaJS to decode image...');

        Quagga.decodeSingle(
          {
            decoder: {
              readers: [
                'upc_reader',
                'upc_e_reader',
                'ean_reader',
                'ean_8_reader',
                'code_128_reader',
                'code_39_reader',
                'codabar_reader',
              ],
              multiple: false,
            },
            locate: true,
            locator: {
              patchSize: 'medium',
              halfSample: true,
            },
            numOfWorkers: 0,
            src: canvas.toDataURL('image/png'),
          },
          (result: any) => {
            if (result && result.codeResult && result.codeResult.code) {
              console.log('🎥 [iOS Debug] QuaggaJS detected barcode:', result.codeResult.code);
              resolve(result.codeResult.code);
            } else {
              console.log('🎥 [iOS Debug] QuaggaJS - no barcode detected in this frame');
              resolve(null);
            }
          }
        );
      } catch (err) {
        console.error('🎥 [iOS Debug] QuaggaJS detection error:', err);
        resolve(null);
      }
    });
  };

  const detectBarcode = async (canvas: HTMLCanvasElement): Promise<string | null> => {
    try {
      // Try native BarcodeDetector API first (Chrome/Android/Edge - faster)
      if ('BarcodeDetector' in window) {
        console.log('🎥 [iOS Debug] Using native BarcodeDetector API');
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        });

        const barcodes = await barcodeDetector.detect(canvas);

        if (barcodes.length > 0) {
          console.log('🎥 [iOS Debug] Native API detected barcode:', barcodes[0].rawValue);
          return barcodes[0].rawValue;
        }
      } else {
        // Fall back to QuaggaJS for Safari/iOS
        console.log('🎥 [iOS Debug] BarcodeDetector not available, using QuaggaJS fallback');
        return await detectWithQuagga(canvas);
      }
    } catch (err) {
      console.error('🎥 [iOS Debug] Barcode detection error:', err);
      // Try QuaggaJS as fallback on error
      console.log('🎥 [iOS Debug] Falling back to QuaggaJS due to error');
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
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-80 object-cover"
                />

                {/* Scanning Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Camera Initializing */}
                    {cameraInitializing && (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-white text-center bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                          <div className="text-sm">Initializing camera...</div>
                        </div>
                      </div>
                    )}

                    {/* Scanning Frame */}
                    {!cameraInitializing && (
                      <div className="w-64 h-32 border-2 border-white rounded-lg relative">
                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse"></div>
                      </div>
                    )}

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
                      {cameraInitializing
                        ? 'Starting camera...'
                        : loading
                          ? 'Processing...'
                          : 'Align barcode within the frame'}
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

              {/* Scanning Activity */}
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <div className="text-blue-800 text-xs text-center">
                  Scanning... ({scanAttempts} attempts)
                  <div className="mt-1 text-blue-600">
                    💡 Tip: Hold barcode steady, ensure good lighting
                  </div>
                </div>
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
              {error.includes('permission') && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    How to enable camera on iOS:
                  </p>
                  <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Go to Settings → Safari → Camera</li>
                    <li>Set to "Allow" or "Ask"</li>
                    <li>Refresh this page and try again</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
