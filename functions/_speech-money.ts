// Speech money helpers — keep in sync with lib/speech-money.ts (InsForge deploys single files)

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
] as const;

function numberUnder100(n: number): string {
  if (n < 20) return ONES[n]!;
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one ? `${TENS[ten]}-${ONES[one]}` : TENS[ten]!;
}

function numberUnder1000(n: number): string {
  if (n < 100) return numberUnder100(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (rest === 0) return `${ONES[hundred]} hundred`;
  return `${ONES[hundred]} hundred ${numberUnder100(rest)}`;
}

function integerToWords(n: number): string {
  const amount = Math.max(0, Math.round(n));
  if (amount === 0) return "zero";
  if (amount >= 1_000_000_000) return String(amount);

  const parts: string[] = [];
  let remaining = amount;

  const millions = Math.floor(remaining / 1_000_000);
  if (millions) {
    parts.push(`${numberUnder1000(millions)} million`);
    remaining %= 1_000_000;
  }

  const thousands = Math.floor(remaining / 1_000);
  if (thousands) {
    parts.push(`${numberUnder1000(thousands)} thousand`);
    remaining %= 1_000;
  }

  if (remaining) {
    parts.push(numberUnder1000(remaining));
  }

  return parts.join(" ");
}

function normalizeDollarAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

function formatDollarsForSpeech(amount: number): string {
  const dollars = normalizeDollarAmount(amount);
  const label = dollars === 1 ? "dollar" : "dollars";
  return `${integerToWords(dollars)} ${label}`;
}

function formatDollarsPerMonthForSpeech(amount: number): string {
  const dollars = normalizeDollarAmount(amount);
  if (dollars >= 1_000 && dollars < 10_000 && dollars % 100 === 0) {
    const hundreds = dollars / 100;
    return `${numberUnder100(hundreds)} hundred dollars per month`;
  }
  return `${formatDollarsForSpeech(dollars)} per month`;
}

function formatDollarsPerYearForSpeech(amount: number): string {
  return `${formatDollarsForSpeech(amount)} per year`;
}
