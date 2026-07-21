export const POSTER_PRICE_PER_CREDIT_KES = 50;

const LEGACY_PACKAGE_PRICE_FACTOR = 0.5;

export function currentPackageAmountKes(legacyAmountKes: number) {
  return Math.round(Number(legacyAmountKes) * LEGACY_PACKAGE_PRICE_FACTOR);
}
