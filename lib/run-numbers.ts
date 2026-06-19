import {
  formatDollarsForSpeech,
  formatDollarsPerYearForSpeech,
} from "./speech-money.js";

export type ListingNumbersInput = {
  address: string;
  city: string;
  state: string;
  list_price: number;
  rent_estimate: number;
  taxes_annual: number;
  insurance_annual: number;
};

export type ListingNumbersResult = {
  grossRentAnnual: number;
  expenses: number;
  noi: number;
  capRate: number;
  cashOnCash: number;
};

export function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function calculateNumbers(
  data: ListingNumbersInput,
): ListingNumbersResult {
  const rentMonthly = Number(data.rent_estimate ?? 0);
  const listPrice = Number(data.list_price ?? 0);
  const taxes = Number(data.taxes_annual ?? 0);
  const insurance = Number(data.insurance_annual ?? 0);

  const grossRentAnnual = rentMonthly * 12;
  const mgmtRepairs = grossRentAnnual * 0.1;
  const expenses = taxes + insurance + mgmtRepairs;
  const noi = grossRentAnnual - expenses;
  const capRate = listPrice > 0 ? (noi / listPrice) * 100 : 0;
  const cashOnCash = listPrice > 0 ? (noi / listPrice) * 100 : 0;

  return { grossRentAnnual, expenses, noi, capRate, cashOnCash };
}

export function formatNumbersSummary(
  data: ListingNumbersInput,
  calc: ListingNumbersResult,
): string {
  return (
    `Numbers for ${data.address}, ${data.city} ${data.state}. ` +
    `Gross rent about ${formatDollarsPerYearForSpeech(calc.grossRentAnnual)}. ` +
    `Expenses roughly ${formatDollarsForSpeech(calc.expenses)} including taxes, insurance, and 10% for management and repairs. ` +
    `Net operating income about ${formatDollarsForSpeech(calc.noi)}. ` +
    `Cap rate ${calc.capRate.toFixed(1)} percent. ` +
    `Rough cash-on-cash around ${calc.cashOnCash.toFixed(1)} percent assuming all-cash purchase.`
  );
}
