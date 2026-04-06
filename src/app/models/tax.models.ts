export type TaxpayerCategory = 'general' | 'female' | 'disabled' | 'freedom_fighter';

export interface TaxSlab {
  limit: number;
  rate: number;
}

export interface SalaryBreakdownConfig {
  basicPercent: number;
  houseRentPercent: number;
  medicalPercent: number;
  conveyancePercent: number;
  otherPercent: number;
}

export interface SalaryLimits {
  houseRent: {
    maxPercentOfBasic: number;
    maxAbsolute: number;
  };
  medical: {
    maxPercentOfBasic: number;
    maxAbsolute: number;
  };
  conveyance: {
    exemptAmount: number;
  };
}

export interface TaxConfig {
  taxYear: {
    fiscalYearStart: number;
    fiscalYearEnd: number;
    assessmentYearStart: number;
    assessmentYearEnd: number;
  };
  taxFreeThresholds: {
    general: number;
    female: number;
    disabled: number;
    freedom_fighter: number;
  };
  slabs: TaxSlab[];
  investment: {
    maxPercentOfIncome: number;
    maxAbsoluteAmount: number;
  };
  rebate: {
    rate: number;
    maxPercentOfIncome: number;
    maxAbsoluteAmount: number;
  };
  minimumTax: {
    enabled: boolean;
    amount: number;
  };
  surcharge: {
    threshold: number;
    rate: number;
  };
  salaryBreakdown: SalaryBreakdownConfig;
  salaryLimits: SalaryLimits;
}

export interface GrossSalaryComponent {
  percent: number;
  calculated: number;
  exempt: number;
  taxable: number;
}

export interface GrossSalaryBreakdownItem {
  nameEn: string;
  nameBn: string;
  percent: number;
  calculatedAmount: number;
  allowedAmount: number;
  adjustmentApplied: boolean;
}

export interface GrossSalaryBreakdown {
  basic: GrossSalaryComponent;
  houseRent: GrossSalaryComponent;
  medical: GrossSalaryComponent;
  conveyance: GrossSalaryComponent;
  other: GrossSalaryComponent;
  items: GrossSalaryBreakdownItem[];
  totalCalculated: number;
  totalExempt: number;
  totalTaxable: number;
}

export interface SalaryPeriod {
  monthsWorked: number;
  monthlyBasic: number;
  monthlyHouseRent: number;
  monthlyMedical: number;
  monthlyConveyance: number;
  monthlyOther: number;
}

export interface TaxInput {
  category: TaxpayerCategory;
  salaryPeriods: SalaryPeriod[];
  yearlyBonus: number;
  rentalIncome: number;
  businessIncome: number;
  capitalGain: number;
  financialIncome: number;
  otherIncome: number;
  investmentAmount: number;
  netAssets: number;
}

export interface SlabBreakdown {
  slabIndex: number;
  rangeEn: string;
  rangeBn: string;
  rate: number;
  taxableAmount: number;
  tax: number;
}

export interface ExplanationStep {
  text: string;
  subItems?: string[];
}

export interface TaxResult {
  totalIncome: number;
  salaryIncome: number;
  monthlySalaryIncome: number;
  yearlyBonus: number;
  taxFreeThreshold: number;
  taxableIncome: number;
  slabBreakdown: SlabBreakdown[];
  grossTax: number;
  eligibleInvestment: number;
  rebate: number;
  taxAfterRebate: number;
  minimumTaxApplied: boolean;
  minimumTaxAmount: number;
  payableTax: number;
  surcharge: number;
  finalTax: number;
  explanationEn: ExplanationStep[];
  explanationBn: ExplanationStep[];
}
