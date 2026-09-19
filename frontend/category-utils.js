const VALID_CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Other',
  'Home'
];

const CATEGORY_KEYWORDS = {
  Food: [
    'grocer', 'grocery', 'milk', 'bread', 'rice', 'vegetable', 'fruit', 'restaurant', 'cafe',
    'coffee', 'tea', 'lunch', 'dinner', 'snack', 'pizza', 'burger', 'supermarket', 'meal',
    'food', 'eat', 'breakfast', 'dosa', 'idli', 'biryani', 'hotel'
  ],
  Travel: [
    'cab', 'uber', 'ola', 'train', 'bus', 'flight', 'fuel', 'petrol', 'diesel', 'parking',
    'ticket', 'travel', 'airport', 'metro', 'ride', 'auto', 'taxi', 'hotel stay', 'trip'
  ],
  Shopping: [
    'shirt', 'shoes', 'dress', 'bag', 'watch', 'phone', 'electronics', 'purchase', 'shopping',
    'market', 'store', 'amazon', 'flipkart', 'retail', 'toy', 'cosmetic', 'decor'
  ],
  Bills: [
    'rent', 'electricity', 'water', 'internet', 'wifi', 'mobile bill', 'phone bill', 'subscription',
    'utility', 'maintenance', 'gas', 'insurance', 'loan', 'emi', 'bill', 'invoice'
  ],
  Entertainment: [
    'movie', 'cinema', 'netflix', 'spotify', 'music', 'games', 'streaming', 'theater', 'concert',
    'party', 'event', 'hobby', 'book', 'game', 'entertainment'
  ],
  Health: [
    'doctor', 'hospital', 'medicine', 'pharmacy', 'clinic', 'health', 'vitamin', 'checkup',
    'therapy', 'dentist', 'lab', 'diagnostic', 'fitness'
  ],
  Home: [
    'furniture', 'appliance', 'decor', 'home', 'house', 'rent', 'maintenance', 'repair', 'cleaning'
  ]
};

function normalizeCategoryName(value) {
  const clean = String(value || '').trim().toLowerCase();

  if (!clean) {
    return 'Other';
  }

  const matched = VALID_CATEGORIES.find((category) => {
    const normalizedCategory = category.toLowerCase();
    return clean === normalizedCategory || clean.includes(normalizedCategory);
  });

  return matched || 'Other';
}

function detectCategoryByKeywords(description) {
  const text = String(description || '').toLowerCase();

  if (!text.trim()) {
    return 'Other';
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matched = keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    if (matched) {
      return category;
    }
  }

  return 'Other';
}

if (typeof module !== 'undefined') {
  module.exports = {
    VALID_CATEGORIES,
    CATEGORY_KEYWORDS,
    normalizeCategoryName,
    detectCategoryByKeywords
  };
}
