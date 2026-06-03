// Currencies with zero minor units (no cents).
const ZERO_DECIMAL = new Set(["CLP", "JPY", "KRW", "VND", "PYG", "UGX"]);

export const SUPPORTED_CURRENCIES = [
  "CLP",
  "USD",
  "EUR",
  "ARS",
  "MXN",
  "BRL",
  "COP",
  "PEN",
] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export function decimalsFor(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

/** Parse a user-typed decimal string into integer minor units. */
export function parseAmountToMinor(input: string, currency: string): number | null {
  const trimmed = input.replace(/\s/g, "").replace(/,/g, ".");
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const decimals = decimalsFor(currency);
  const [intPart, fracPart = ""] = trimmed.split(".");
  if (decimals === 0) {
    // Round half-up for zero-decimal currencies.
    const major = Number(intPart);
    const fracRound = fracPart.length > 0 && Number(`0.${fracPart}`) >= 0.5 ? 1 : 0;
    return major + (major < 0 ? -fracRound : fracRound);
  }
  const fracPadded = (fracPart + "0".repeat(decimals)).slice(0, decimals);
  const next = fracPart.charAt(decimals);
  const roundUp = next && Number(next) >= 5 ? 1 : 0;
  const minor = Number(intPart) * 10 ** decimals + Number(fracPadded || "0");
  return minor + (minor < 0 ? -roundUp : roundUp);
}

export function formatMinor(minor: number, currency: string, locale = "es-CL"): string {
  const decimals = decimalsFor(currency);
  const value = minor / 10 ** decimals;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `${value.toFixed(decimals)} ${currency}`;
  }
}
