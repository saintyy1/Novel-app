// Currency conversion utilities
// Exchange rates are approximate and should be updated regularly
// For production, consider using a real-time exchange rate API

const RATES_STORAGE_KEY = 'novlnest_currency_rates'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export interface Currency {
  code: string
  symbol: string
  name: string
  rateToNaira: number // How many units of this currency = 1 Naira
}

export const CURRENCIES: Record<string, Currency> = {
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rateToNaira: 1 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateToNaira: 1560 }, // 1 USD = 1560 Naira
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateToNaira: 1720 }, // 1 EUR = 1720 Naira
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateToNaira: 2000 }, // 1 GBP = 2000 Naira
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateToNaira: 1150 }, // 1 CAD = 1150 Naira
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateToNaira: 1050 }, // 1 AUD = 1050 Naira
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToNaira: 11 }, // 1 JPY = 11 Naira
  GHS: { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', rateToNaira: 105 }, // 1 GHS = 105 Naira
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', rateToNaira: 12 }, // 1 KES = 12 Naira
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', rateToNaira: 85 }, // 1 ZAR = 85 Naira
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', rateToNaira: 32 }, // 1 EGP = 32 Naira
}

/**
 * Update CURRENCIES object from a simple map of rateToNaira
 */
const updateCurrencyRatesInObject = (rates: Record<string, number>) => {
  for (const code in rates) {
    if (CURRENCIES[code]) {
      CURRENCIES[code].rateToNaira = rates[code]
    }
  }
}

/**
 * Fetch latest rates from open.er-api.com with 24-hour caching
 */
export const fetchLatestRates = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  try {
    // 1. Try to load from cache first
    const cachedData = localStorage.getItem(RATES_STORAGE_KEY)
    if (cachedData) {
      try {
        const { rates, timestamp } = JSON.parse(cachedData)
        
        // If cache is still valid, update the object and return
        if (Date.now() - timestamp < CACHE_DURATION) {
          updateCurrencyRatesInObject(rates)
          console.log('[Currency] Using cached rates from', new Date(timestamp).toLocaleString())
          return true
        }
      } catch (e) {
        console.error('Error parsing cached rates:', e)
      }
    }

    // 2. Fetch fresh rates
    console.log('[Currency] Fetching fresh rates...')
    const response = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await response.json()

    if (data.result === 'success') {
      const ngnRate = data.rates['NGN']
      if (!ngnRate) throw new Error('NGN rate not found in API response')

      const updatedRates: Record<string, number> = {}
      
      // Calculate rateToNaira for each currency we support
      // Formula: 1 unit of foreign currency = (1 / usd_per_foreign) * ngn_per_usd NGN
      for (const code in CURRENCIES) {
        if (code === 'NGN') {
          updatedRates[code] = 1
        } else if (data.rates[code]) {
          updatedRates[code] = ngnRate / data.rates[code]
        }
      }

      // 3. Save to cache and update object
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify({
        rates: updatedRates,
        timestamp: Date.now()
      }))
      
      updateCurrencyRatesInObject(updatedRates)
      console.log('[Currency] Rates updated successfully')
      return true
    } else {
      console.error('Failed to fetch currency rates:', data['error-type'])
      return false
    }
  } catch (error) {
    console.error('Error in fetchLatestRates:', error)
    // Fall back to hardcoded rates (already in CURRENCIES)
    return false
  }
}

// Default currency fallback
export const DEFAULT_CURRENCY = 'NGN'

/**
 * Detect user's preferred currency based on browser locale
 */
export const detectUserCurrency = (): string => {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY
  
  try {
    // Get browser locale
    const locale = navigator.language || navigator.languages?.[0] || 'en-US'
    
    // Extract country code from locale (e.g., 'en-US' -> 'US')
    const countryCode = locale.split('-')[1]?.toUpperCase()
    
    // Map country codes to currencies
    const countryToCurrency: Record<string, string> = {
      'US': 'USD',
      'CA': 'CAD',
      'GB': 'GBP',
      'AU': 'AUD',
      'JP': 'JPY',
      'DE': 'EUR',
      'FR': 'EUR',
      'IT': 'EUR',
      'ES': 'EUR',
      'NL': 'EUR',
      'BE': 'EUR',
      'AT': 'EUR',
      'IE': 'EUR',
      'PT': 'EUR',
      'FI': 'EUR',
      'LU': 'EUR',
      'MT': 'EUR',
      'CY': 'EUR',
      'SK': 'EUR',
      'SI': 'EUR',
      'EE': 'EUR',
      'LV': 'EUR',
      'LT': 'EUR',
      'GH': 'GHS',
      'KE': 'KES',
      'ZA': 'ZAR',
      'EG': 'EGP',
      'NG': 'NGN',
    }
    
    const detectedCurrency = countryToCurrency[countryCode]
    
    // Return detected currency if available, otherwise default
    return detectedCurrency && CURRENCIES[detectedCurrency] ? detectedCurrency : DEFAULT_CURRENCY
  } catch (error) {
    console.warn('Error detecting user currency:', error)
    return DEFAULT_CURRENCY
  }
}

/**
 * Convert Naira amount to another currency
 */
export const convertFromNaira = (nairaAmount: number, targetCurrency: string): number => {
  const currency = CURRENCIES[targetCurrency]
  if (!currency) {
    console.warn(`Currency ${targetCurrency} not found, using Naira`)
    return nairaAmount
  }
  
  // Convert: nairaAmount * (1 / rateToNaira) = targetCurrencyAmount
  return nairaAmount * (1 / currency.rateToNaira)
}

/**
 * Convert amount from another currency back to Naira
 */
export const convertToNaira = (amount: number, sourceCurrency: string): number => {
  const currency = CURRENCIES[sourceCurrency]
  if (!currency) {
    console.warn(`Currency ${sourceCurrency} not found, treating as Naira`)
    return amount
  }
  
  // Convert: amount * rateToNaira = nairaAmount
  return amount * currency.rateToNaira
}

/**
 * Format currency amount with proper symbol and decimal places
 */
export const formatCurrency = (amount: number, currencyCode: string): string => {
  const currency = CURRENCIES[currencyCode]
  if (!currency) {
    return `₦${amount.toFixed(0)}`
  }
  
  // Round to appropriate decimal places based on currency
  const decimalPlaces = ['JPY', 'KRW'].includes(currencyCode) ? 0 : 2
  const roundedAmount = Math.round(amount * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces)
  
  return `${currency.symbol}${roundedAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  })}`
}

/**
 * Get all available currencies as an array
 */
export const getAvailableCurrencies = (): Currency[] => {
  return Object.values(CURRENCIES)
}

/**
 * Get currency by code
 */
export const getCurrencyByCode = (code: string): Currency | null => {
  return CURRENCIES[code] || null
}
