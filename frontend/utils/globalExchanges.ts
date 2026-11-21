import { geoContains } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';

export type ExchangeRegion = 'Americas' | 'Europe' | 'Asia-Pacific' | 'MEA';

export interface StockExchangeNode {
  id: string;
  code: string;
  name: string;
  country: string;
  flag: string;
  city: string;
  region: ExchangeRegion;
  lat: number;
  lng: number;
  instruments: string;
  benchmark: string;
  sampleTicker: string;
  badgeBg: string;
  badgeText: string;
}

export const GLOBAL_STOCK_EXCHANGES: StockExchangeNode[] = [
  {
    id: 'bvc',
    code: 'BVC',
    name: 'Caracas Sovereign & Fund Hub',
    country: 'Venezuela',
    flag: '🇻🇪',
    city: 'Caracas',
    region: 'Americas',
    lat: 10.4806,
    lng: -66.9036,
    instruments: 'Sovereign Debt • Funds • Indices',
    benchmark: 'IBC General',
    sampleTicker: 'GLD',
    badgeBg: '#1B5E20',
    badgeText: 'BVC',
  },
  {
    id: 'nyse',
    code: 'NYSE',
    name: 'NYSE Arca ETF & Bullion Hub',
    country: 'United States',
    flag: '🇺🇸',
    city: 'New York',
    region: 'Americas',
    lat: 40.7069,
    lng: -74.0113,
    instruments: 'ETFs • Gold Trusts • Debt Bonds',
    benchmark: 'S&P 500 ETF',
    sampleTicker: 'SPY',
    badgeBg: '#1D4ED8',
    badgeText: 'NYSE',
  },
  {
    id: 'nasdaq',
    code: 'NASDAQ',
    name: 'Nasdaq ETF & Treasury Desk',
    country: 'United States',
    flag: '🇺🇸',
    city: 'New York',
    region: 'Americas',
    lat: 41.758,
    lng: -71.9855,
    instruments: 'Index ETFs • Treasury ETFs • Funds',
    benchmark: 'Invesco QQQ',
    sampleTicker: 'QQQ',
    badgeBg: '#0284C7',
    badgeText: 'NDAQ',
  },
  {
    id: 'tsx',
    code: 'TSX',
    name: 'Toronto ETF & Bullion Exchange',
    country: 'Canada',
    flag: '🇨🇦',
    city: 'Toronto',
    region: 'Americas',
    lat: 43.6487,
    lng: -79.3854,
    instruments: 'ETFs • Physical Gold • Fixed Income',
    benchmark: 'S&P/TSX ETF',
    sampleTicker: 'GLD',
    badgeBg: '#B91C1C',
    badgeText: 'TSX',
  },
  {
    id: 'bmv',
    code: 'BMV',
    name: 'Mexico Debt & Index ETF Hub',
    country: 'Mexico',
    flag: '🇲🇽',
    city: 'Mexico City',
    region: 'Americas',
    lat: 19.4285,
    lng: -99.1677,
    instruments: 'Index ETFs • M-Bono Debt • Funds',
    benchmark: 'NAFTRAC ETF',
    sampleTicker: 'AGG',
    badgeBg: '#047857',
    badgeText: 'BMV',
  },
  {
    id: 'b3',
    code: 'B3',
    name: 'Brasil Fixed Income & ETF Desk',
    country: 'Brazil',
    flag: '🇧🇷',
    city: 'São Paulo',
    region: 'Americas',
    lat: -23.5467,
    lng: -46.6345,
    instruments: 'ETFs • Treasury Funds • Gold',
    benchmark: 'BOVA11 ETF',
    sampleTicker: 'VTI',
    badgeBg: '#0369A1',
    badgeText: 'B3',
  },
  {
    id: 'lse',
    code: 'LSE',
    name: 'London LBMA Gold & UCITS ETF Hub',
    country: 'United Kingdom',
    flag: '🇬🇧',
    city: 'London',
    region: 'Europe',
    lat: 51.5145,
    lng: -0.099,
    instruments: 'LBMA Gold • UCITS ETFs • Gilts',
    benchmark: 'LBMA Gold PM',
    sampleTicker: 'PAXGUSDT',
    badgeBg: '#4338CA',
    badgeText: 'LSE',
  },
  {
    id: 'euronext',
    code: 'ENX',
    name: 'Euronext Paris ETF & Debt',
    country: 'France',
    flag: '🇫🇷',
    city: 'Paris',
    region: 'Europe',
    lat: 48.8919,
    lng: 2.2389,
    instruments: 'UCITS ETFs • Euro Debt • Funds',
    benchmark: 'CAC 40 ETF',
    sampleTicker: 'VOO',
    badgeBg: '#0F766E',
    badgeText: 'ENX',
  },
  {
    id: 'fwb',
    code: 'XETR',
    name: 'Frankfurt Xetra ETF & Bund Hub',
    country: 'Germany',
    flag: '🇩🇪',
    city: 'Frankfurt',
    region: 'Europe',
    lat: 50.1155,
    lng: 8.6782,
    instruments: 'Xetra Gold • ETFs • Sovereign Bunds',
    benchmark: 'Xetra-Gold',
    sampleTicker: 'GLD',
    badgeBg: '#1E293B',
    badgeText: 'XETR',
  },
  {
    id: 'six',
    code: 'SIX',
    name: 'SIX Swiss Gold Vault & ETFs',
    country: 'Switzerland',
    flag: '🇨🇭',
    city: 'Zurich',
    region: 'Europe',
    lat: 47.3769,
    lng: 8.5417,
    instruments: 'Swiss Gold ETF • Bonds • Mutual Funds',
    benchmark: 'ZGLD Vault',
    sampleTicker: 'TLT',
    badgeBg: '#DC2626',
    badgeText: 'SIX',
  },
  {
    id: 'nse',
    code: 'NSE',
    name: 'NSE ETF, Gold BeES & G-Sec Hub',
    country: 'India',
    flag: '🇮🇳',
    city: 'Mumbai',
    region: 'Asia-Pacific',
    lat: 19.0607,
    lng: 72.8634,
    instruments: 'Gold BeES • Nifty ETFs • SGBs • G-Sec',
    benchmark: 'NIFTYBEES',
    sampleTicker: 'GOLDBEES',
    badgeBg: '#EA580C',
    badgeText: 'NSE',
  },
  {
    id: 'bse',
    code: 'BSE',
    name: 'BSE StAR MF & Corporate Debt',
    country: 'India',
    flag: '🇮🇳',
    city: 'Mumbai',
    region: 'Asia-Pacific',
    lat: 18.9296,
    lng: 72.8332,
    instruments: 'AMFI Mutual Funds • Debt • Liquid BeES',
    benchmark: 'AMFI Direct MF',
    sampleTicker: 'PPFAS',
    badgeBg: '#1D4ED8',
    badgeText: 'BSE',
  },
  {
    id: 'tse',
    code: 'TSE',
    name: 'Tokyo ETF & JGB Bond Exchange',
    country: 'Japan',
    flag: '🇯🇵',
    city: 'Tokyo',
    region: 'Asia-Pacific',
    lat: 35.6819,
    lng: 139.7785,
    instruments: 'Index ETFs • JGB Debt • Gold ETF',
    benchmark: 'TOPIX ETF',
    sampleTicker: 'AGG',
    badgeBg: '#0E7490',
    badgeText: 'TSE',
  },
  {
    id: 'hkex',
    code: 'HKEX',
    name: 'Hong Kong Bullion & Cross-Border ETFs',
    country: 'Hong Kong',
    flag: '🇭🇰',
    city: 'Hong Kong',
    region: 'Asia-Pacific',
    lat: 22.2849,
    lng: 114.1586,
    instruments: 'Bullion ETFs • Bond Connect • Funds',
    benchmark: 'Tracker Fund',
    sampleTicker: 'INDA',
    badgeBg: '#0369A1',
    badgeText: 'HKEX',
  },
  {
    id: 'sse',
    code: 'SSE',
    name: 'Shanghai Gold & Bond Connect Hub',
    country: 'China',
    flag: '🇨🇳',
    city: 'Shanghai',
    region: 'Asia-Pacific',
    lat: 31.2304,
    lng: 121.4737,
    instruments: 'Gold Vaults • CGB Debt • ETFs',
    benchmark: 'SGE Au99.99',
    sampleTicker: 'PAXGUSDT',
    badgeBg: '#991B1B',
    badgeText: 'SSE',
  },
  {
    id: 'krx',
    code: 'KRX',
    name: 'Korea ETF & Sovereign Debt Desk',
    country: 'South Korea',
    flag: '🇰🇷',
    city: 'Seoul',
    region: 'Asia-Pacific',
    lat: 37.5219,
    lng: 126.9242,
    instruments: 'KODEX ETFs • KTB Bonds • Gold',
    benchmark: 'KODEX 200',
    sampleTicker: 'NIFTYBEES',
    badgeBg: '#1E40AF',
    badgeText: 'KRX',
  },
  {
    id: 'sgx',
    code: 'SGX',
    name: 'Singapore Precious Metals & Bond Hub',
    country: 'Singapore',
    flag: '🇸🇬',
    city: 'Singapore',
    region: 'Asia-Pacific',
    lat: 1.279,
    lng: 103.8505,
    instruments: 'SPDR Gold SG • Sovereign Debt • ETFs',
    benchmark: 'SGX Gold',
    sampleTicker: 'SBIGILT',
    badgeBg: '#0F766E',
    badgeText: 'SGX',
  },
  {
    id: 'asx',
    code: 'ASX',
    name: 'Sydney ETF & Physical Gold Hub',
    country: 'Australia',
    flag: '🇦🇺',
    city: 'Sydney',
    region: 'Asia-Pacific',
    lat: -33.8651,
    lng: 151.2099,
    instruments: 'Perth Mint Gold • Bond ETFs • Funds',
    benchmark: 'GOLD.ASX',
    sampleTicker: 'SILVERBEES',
    badgeBg: '#1D4ED8',
    badgeText: 'ASX',
  },
  {
    id: 'tadawul',
    code: 'TADAWUL',
    name: 'Riyadh Sukuk & ETF Exchange',
    country: 'Saudi Arabia',
    flag: '🇸🇦',
    city: 'Riyadh',
    region: 'MEA',
    lat: 24.7136,
    lng: 46.6753,
    instruments: 'Sukuk Debt • Gold ETFs • Mutual Funds',
    benchmark: 'Sukuk Index',
    sampleTicker: 'HDFCCORP',
    badgeBg: '#15803D',
    badgeText: 'TDWL',
  },
  {
    id: 'jse',
    code: 'JSE',
    name: 'Johannesburg Bullion ETF & Bond Desk',
    country: 'South Africa',
    flag: '🇿🇦',
    city: 'Johannesburg',
    region: 'MEA',
    lat: -26.1076,
    lng: 28.0567,
    instruments: 'NewGold ETF • Sovereign Bonds • Funds',
    benchmark: 'NewGold ETF',
    sampleTicker: 'LIQUIDBEES',
    badgeBg: '#B45309',
    badgeText: 'JSE',
  },
];

const DEG2RAD = Math.PI / 180;

/**
 * Maps geographic (lat, lng) onto a Three.js Y-up right-handed sphere of given radius.
 * Standard Earth convention: (lat=0, lng=0) faces +Z; east (+lng) rotates toward +X.
 */
export function latLngToCartesian(
  lat: number,
  lng: number,
  radius = 1
): { x: number; y: number; z: number } {
  const latRad = lat * DEG2RAD;
  const lngRad = lng * DEG2RAD;
  const cosLat = Math.cos(latRad);
  return {
    x: radius * cosLat * Math.sin(lngRad),
    y: radius * Math.sin(latRad),
    z: radius * cosLat * Math.cos(lngRad),
  };
}

/**
 * Computes camera position along the outward normal of a target (lat, lng) at `distance`
 * so OrbitControls looks directly at the selected stock exchange on the 3D globe.
 */
export function computeFocusCameraPosition(
  lat: number,
  lng: number,
  distance = 2.9
): { x: number; y: number; z: number } {
  // Clamp polar angle near poles to stay comfortably within OrbitControls polar bounds
  const clampedLat = Math.max(-72, Math.min(72, lat));
  return latLngToCartesian(clampedLat, lng, distance);
}

/**
 * Generates uniform Fibonacci-sphere sample points and retains only points inside land polygons.
 */
export function sampleFibonacciLandDots(
  landGeo: GeoPermissibleObjects,
  totalSamples = 14000,
  radius = 1.003
): Float32Array {
  const coords: number[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < totalSamples; i += 1) {
    const t = (i + 0.5) / totalSamples;
    const y = 1 - 2 * t;
    const lat = Math.asin(y) / DEG2RAD;
    const rawLng = (((i * goldenAngle) / DEG2RAD + 180) % 360 + 360) % 360 - 180;

    if (geoContains(landGeo, [rawLng, lat])) {
      const p = latLngToCartesian(lat, rawLng, radius);
      coords.push(p.x, p.y, p.z);
    }
  }

  return new Float32Array(coords);
}
