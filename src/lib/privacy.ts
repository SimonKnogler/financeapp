/**
 * Formats currency with optional privacy mode
 */
export function formatCurrency(
  value: number,
  currency: string = "EUR",
  privacyMode: boolean = false
): string {
  if (privacyMode) {
    return "•••••";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats currency with decimals and optional privacy mode
 */
export function formatCurrencyDetailed(
  value: number,
  currency: string = "EUR",
  privacyMode: boolean = false
): string {
  if (privacyMode) {
    return "•••••";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a number with optional privacy mode
 */
export function formatNumber(
  value: number,
  privacyMode: boolean = false
): string {
  if (privacyMode) {
    return "•••";
  }

  return value.toLocaleString();
}

/**
 * Formats a percentage with optional privacy mode
 */
export function formatPercent(
  value: number,
  privacyMode: boolean = false,
  decimals: number = 2
): string {
  if (privacyMode) {
    return "•••%";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

