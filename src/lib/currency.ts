const inrFormatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/**
 * Format a number into Indian Rupee style grouping (e.g. 12,34,567.89)
 * @param amount numeric value to format
 * @param options control symbol rendering
 */
export function formatINR(amount: number, options: { withSymbol?: boolean } = {}): string {
    const { withSymbol = true } = options;
    const sign = amount < 0 ? '-' : '';
    const absolute = Math.abs(amount);
    const formatted = inrFormatter.format(absolute);
    return `${sign}${withSymbol ? '₹' : ''}${formatted}`;
}

export function formatINRNoSymbol(amount: number): string {
    return formatINR(amount, { withSymbol: false });
}
