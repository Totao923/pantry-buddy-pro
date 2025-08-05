import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../lib/auth/AuthProvider';

interface ReceiptScannerProps {
  onReceiptScanned: (imageData: string, file: File) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function ReceiptScanner({
  onReceiptScanned,
  onClose,
  loading = false,
}: ReceiptScannerProps) {
  const { subscription } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isFreeTier = subscription?.tier === 'free';
  // Allow receipt scanning for all users during development/testing
  // In production, change this to: const canScanReceipts = !isFreeTier;
  const canScanReceipts = true;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (!canScanReceipts) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(file => file.type.startsWith('image/'));

      if (imageFile) {
        processImageFile(imageFile);
      }
    },
    [canScanReceipts]
  );

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  }, []);

  const processImageFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const imageData = e.target?.result as string;
      setPreviewImage(imageData);
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);
  }, []);

  const startCamera = useCallback(async () => {
    if (!canScanReceipts) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please use file upload instead.');
    }
  }, [canScanReceipts]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(
        blob => {
          if (blob) {
            const file = new File([blob], 'receipt-photo.jpg', { type: 'image/jpeg' });
            const imageData = canvas.toDataURL('image/jpeg', 0.9);

            setPreviewImage(imageData);
            setSelectedFile(file);
            stopCamera();
          }
        },
        'image/jpeg',
        0.9
      );
    }
  }, [stopCamera, canScanReceipts]);

  const handleScanReceipt = useCallback(() => {
    if (previewImage && selectedFile && canScanReceipts) {
      onReceiptScanned(previewImage, selectedFile);
    }
  }, [previewImage, selectedFile, onReceiptScanned, canScanReceipts]);

  const handleReset = useCallback(() => {
    setPreviewImage(null);
    setSelectedFile(null);
    stopCamera();
  }, [stopCamera]);

  if (!canScanReceipts) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h2>
          <p className="text-gray-600 mb-6">
            Receipt scanning is available for Premium users. Upgrade your subscription to
            automatically track your grocery spending and add items to your pantry.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                /* Redirect to subscription page */
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-colors"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <h2 className="text-2xl font-bold text-gray-900">Scan Receipt</h2>
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
          {!previewImage && !cameraActive && (
            <div className="space-y-6">
              {/* Upload Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-pantry-300 hover:bg-pantry-50 transition-all"
                >
                  <span className="text-4xl mb-3">📸</span>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Take Photo</h3>
                  <p className="text-gray-600 text-center">Use your camera to capture a receipt</p>
                </button>

                <div
                  className={`flex flex-col items-center p-8 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                    dragActive
                      ? 'border-pantry-400 bg-pantry-50'
                      : 'border-gray-300 hover:border-pantry-300 hover:bg-pantry-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="text-4xl mb-3">📤</span>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Image</h3>
                  <p className="text-gray-600 text-center">
                    {dragActive ? 'Drop your receipt image here' : 'Drag & drop or click to select'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <span>💡</span>
                  Tips for best results:
                </h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Ensure the entire receipt is visible and well-lit</li>
                  <li>• Avoid shadows and glare on the receipt</li>
                  <li>• Keep the receipt flat and straight</li>
                  <li>• Use high contrast (dark text on light background)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Camera View */}
          {cameraActive && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto max-h-96 object-cover"
                />
                <div className="absolute inset-0 border-2 border-dashed border-white opacity-50 m-4 rounded-lg pointer-events-none"></div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={stopCamera}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="px-8 py-3 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-colors font-semibold flex items-center gap-2"
                >
                  <span className="text-xl">📸</span>
                  Capture Receipt
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewImage && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Receipt Preview</h3>
                <div className="bg-gray-100 rounded-xl p-4 inline-block">
                  <img
                    src={previewImage}
                    alt="Receipt preview"
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Try Again
                </button>
                <button
                  onClick={handleScanReceipt}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-colors font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="text-xl">✨</span>
                      Scan Receipt
                    </>
                  )}
                </button>
              </div>

              {loading && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
                  <p className="text-blue-700">
                    🔍 Analyzing your receipt... This may take a few moments.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
