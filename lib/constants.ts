import { Company } from './types';

export const COMPANIES: Company[] = [
  {
    ticker: 'META',
    name: 'Meta Platforms',
    shortName: 'Meta',
    domain: 'meta.com',
    iconSlug: 'meta',
    brandColor: '#0866FF',
    cardTint: 'rgba(8, 102, 255, 0.06)',
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    shortName: 'Apple',
    domain: 'apple.com',
    iconSlug: 'apple',
    brandColor: '#A2AAAD',
    cardTint: 'rgba(162, 170, 173, 0.06)',
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    shortName: 'Microsoft',
    domain: 'microsoft.com',
    iconSlug: 'microsoft',
    brandColor: '#00A4EF',
    cardTint: 'rgba(0, 164, 239, 0.06)',
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    shortName: 'Amazon',
    domain: 'amazon.com',
    iconSlug: 'amazon',
    brandColor: '#FF9900',
    cardTint: 'rgba(255, 153, 0, 0.06)',
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    shortName: 'Google',
    domain: 'google.com',
    iconSlug: 'google',
    brandColor: '#4285F4',
    cardTint: 'rgba(66, 133, 244, 0.06)',
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corp.',
    shortName: 'NVIDIA',
    domain: 'nvidia.com',
    iconSlug: 'nvidia',
    brandColor: '#76B900',
    cardTint: 'rgba(118, 185, 0, 0.06)',
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    shortName: 'Tesla',
    domain: 'tesla.com',
    iconSlug: 'tesla',
    brandColor: '#E31937',
    cardTint: 'rgba(227, 25, 55, 0.06)',
  },
];

export function getValuationSignal(forwardPE: number | null) {
  if (forwardPE === null || forwardPE <= 0) return 'N/A' as const;
  if (forwardPE < 20) return 'CHEAP' as const;
  if (forwardPE <= 30) return 'FAIR' as const;
  return 'RICH' as const;
}

export function formatBig(value: number | null, prefix = '$'): string {
  if (value === null || value === undefined) return 'N/A';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${prefix}${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${prefix}${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${prefix}${(value / 1e6).toFixed(2)}M`;
  return `${prefix}${value.toFixed(2)}`;
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatRatio(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(1) + 'x';
}

export function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return `$${value.toFixed(2)}`;
}
