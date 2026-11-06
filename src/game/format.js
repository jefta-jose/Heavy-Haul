// Compact coin amounts for the HUD, garage prices and payouts.
const compactCoins = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
export const formatCoins = amount => compactCoins.format(Math.floor(amount));
