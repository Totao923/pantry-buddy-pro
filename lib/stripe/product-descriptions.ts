export const STRIPE_PRODUCT_DESCRIPTIONS = {
  premium: "Unlock advanced meal planning with AI-powered recipe suggestions, unlimited pantry tracking, and personalized nutrition insights. Perfect for home cooks ready to elevate their kitchen game.",
  
  family: "Everything in Premium plus family meal planning for up to 6 members, dietary restriction management, bulk recipe scaling, and collaborative shopping lists. Ideal for busy families.",
  
  chef: "The complete culinary experience with restaurant-quality recipes, advanced nutrition analytics, ingredient sourcing recommendations, and priority AI support. For serious food enthusiasts."
};

export const STRIPE_STATEMENT_DESCRIPTORS = {
  premium: "Pantry Buddy Premium Plan",
  family: "Pantry Buddy Family Plan", 
  chef: "Pantry Buddy Chef Plan"
};

export const getProductDescription = (tier: 'premium' | 'family' | 'chef'): string => {
  return STRIPE_PRODUCT_DESCRIPTIONS[tier];
};

export const getStatementDescriptor = (tier: 'premium' | 'family' | 'chef'): string => {
  return STRIPE_STATEMENT_DESCRIPTORS[tier];
};