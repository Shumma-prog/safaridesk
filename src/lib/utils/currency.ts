const USD_TO_TZS = 2550

export function usdToTzs(usd: number): number {
  return Math.round(usd * USD_TO_TZS)
}

export function tzsToUsd(tzs: number): number {
  return Math.round((tzs / USD_TO_TZS) * 100) / 100
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD'
  }).format(amount)
}

export function formatTZS(amount: number): string {
  return `TZS ${new Intl.NumberFormat('en-TZ').format(amount)}`
}

export function formatCurrency(amount: number, currency: 'USD' | 'TZS'): string {
  return currency === 'USD' ? formatUSD(amount) : formatTZS(amount)
}
