import React, { useState } from 'react';
import { ProductInfo } from '../lib/services/barcodeService';

interface BarcodeItemConfirmProps {
  product: ProductInfo;
  onConfirm: (confirmedData: ConfirmedBarcodeItem) => void;
  onCancel: () => void;
}

export interface ConfirmedBarcodeItem {
  product: ProductInfo;
  price: number;
  quantity: number;
  purchaseDate: Date;
}

export default function BarcodeItemConfirm({
  product,
  onConfirm,
  onCancel,
}: BarcodeItemConfirmProps) {
  const [price, setPrice] = useState<string>(product.price?.toString() || '');
  const [quantity, setQuantity] = useState<string>('1');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleConfirm = () => {
    const confirmedData: ConfirmedBarcodeItem = {
      product,
      price: parseFloat(price) || 0,
      quantity: parseFloat(quantity) || 1,
      purchaseDate: new Date(purchaseDate),
    };
    onConfirm(confirmedData);
  };

  const isValid = price && parseFloat(price) >= 0 && quantity && parseFloat(quantity) > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <h2 className="text-2xl font-bold text-gray-900">Confirm Product</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
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

        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-start gap-4">
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                {product.brand && (
                  <p className="text-sm text-gray-600 mt-1">Brand: {product.brand}</p>
                )}
                {product.size && <p className="text-sm text-gray-600">Size: {product.size}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                    {product.category}
                  </span>
                  {product.isVegan && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Vegan
                    </span>
                  )}
                  {product.isVegetarian && !product.isVegan && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Vegetarian
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (required)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Enter the price you paid for this item</p>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                How many {product.unit || 'items'} did you purchase?
              </p>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Nutritional Info Preview (if available) */}
          {product.nutritionInfo && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Nutritional Info</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                {product.nutritionInfo.calories && (
                  <div>Calories: {product.nutritionInfo.calories}</div>
                )}
                {product.nutritionInfo.protein && (
                  <div>Protein: {product.nutritionInfo.protein}g</div>
                )}
                {product.nutritionInfo.carbs && <div>Carbs: {product.nutritionInfo.carbs}g</div>}
                {product.nutritionInfo.fat && <div>Fat: {product.nutritionInfo.fat}g</div>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Pantry
            </button>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
            <p className="text-xs text-blue-800">
              💡 This item will be added to your pantry and tracked in your spending analytics as a
              single scanned item.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
