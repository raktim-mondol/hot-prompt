export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: string;
  period?: string;
  features: string[];
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SaSKh0cCXHOYUS',
    priceId: 'price_1RfHQ8RvFuWdm2ByorcAPrXa',
    name: 'Hot Prompt Month',
    description: 'Monthly 100 prompt',
    mode: 'payment',
    price: 'AUD $4.95',
    period: 'per month',
    features: [
      '100 AI-generated prompts per month',
      'Advanced prompt templates',
      'Priority generation',
      'Save unlimited favorites',
      'Export prompts',
      'Priority email support'
    ]
  },
  {
    id: 'prod_SaSLpl80w8EOxX',
    priceId: 'price_1RfHR6RvFuWdm2By2DTIZEeu',
    name: 'Hot Prompt Year',
    description: '1500 prompt yearly',
    mode: 'payment',
    price: 'AUD $49.50',
    period: 'per year',
    features: [
      '1,500 AI-generated prompts per year',
      'Advanced prompt templates',
      'Priority generation',
      'Save unlimited favorites',
      'Export prompts',
      'Priority email support',
      'Early access to new features'
    ]
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};