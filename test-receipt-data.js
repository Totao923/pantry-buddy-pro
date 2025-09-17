// Sample receipt data for testing analytics
const sampleReceipts = [
  {
    id: 'receipt-1',
    storeName: 'Whole Foods Market',
    receiptDate: new Date('2025-09-10').toISOString(),
    totalAmount: 85.42,
    taxAmount: 7.21,
    userId: '21fc3c81-a66a-4cf3-be35-c2b70a900864', // Current user ID from logs
    createdAt: new Date('2025-09-10').toISOString(),
    items: [
      {
        id: 'item-1',
        name: 'Organic Bananas',
        quantity: 3,
        unit: 'lbs',
        price: 4.97,
        category: 'fruits',
        confidence: 0.95,
      },
      {
        id: 'item-2',
        name: 'Ground Beef',
        quantity: 2,
        unit: 'lbs',
        price: 15.98,
        category: 'protein',
        confidence: 0.92,
      },
      {
        id: 'item-3',
        name: 'Whole Milk',
        quantity: 1,
        unit: 'gallon',
        price: 3.99,
        category: 'dairy',
        confidence: 0.88,
      },
      {
        id: 'item-4',
        name: 'Pasta',
        quantity: 2,
        unit: 'boxes',
        price: 7.98,
        category: 'grains',
        confidence: 0.91,
      },
    ],
    rawText: 'WHOLE FOODS MARKET...',
    confidence: 0.89,
  },
  {
    id: 'receipt-2',
    storeName: 'Safeway',
    receiptDate: new Date('2025-09-08').toISOString(),
    totalAmount: 42.67,
    taxAmount: 3.12,
    userId: '21fc3c81-a66a-4cf3-be35-c2b70a900864',
    createdAt: new Date('2025-09-08').toISOString(),
    items: [
      {
        id: 'item-5',
        name: 'Chicken Breast',
        quantity: 1.5,
        unit: 'lbs',
        price: 12.47,
        category: 'protein',
        confidence: 0.94,
      },
      {
        id: 'item-6',
        name: 'Broccoli',
        quantity: 2,
        unit: 'heads',
        price: 3.98,
        category: 'vegetables',
        confidence: 0.87,
      },
      {
        id: 'item-7',
        name: 'Olive Oil',
        quantity: 1,
        unit: 'bottle',
        price: 8.99,
        category: 'oils',
        confidence: 0.96,
      },
    ],
    rawText: 'SAFEWAY...',
    confidence: 0.92,
  },
  {
    id: 'receipt-3',
    storeName: "Trader Joe's",
    receiptDate: new Date('2025-09-05').toISOString(),
    totalAmount: 67.23,
    taxAmount: 5.44,
    userId: '21fc3c81-a66a-4cf3-be35-c2b70a900864',
    createdAt: new Date('2025-09-05').toISOString(),
    items: [
      {
        id: 'item-8',
        name: 'Bell Peppers',
        quantity: 3,
        unit: 'each',
        price: 2.97,
        category: 'vegetables',
        confidence: 0.89,
      },
      {
        id: 'item-9',
        name: 'Quinoa',
        quantity: 2,
        unit: 'bags',
        price: 11.98,
        category: 'grains',
        confidence: 0.93,
      },
      {
        id: 'item-10',
        name: 'Greek Yogurt',
        quantity: 4,
        unit: 'containers',
        price: 15.96,
        category: 'dairy',
        confidence: 0.95,
      },
    ],
    rawText: "TRADER JOE'S...",
    confidence: 0.91,
  },
];

// Add to localStorage
localStorage.setItem('userReceipts', JSON.stringify(sampleReceipts));
console.log('Sample receipt data added to localStorage');
console.log('Total receipts:', sampleReceipts.length);
console.log(
  'Total spent:',
  sampleReceipts.reduce((sum, r) => sum + r.totalAmount, 0)
);
