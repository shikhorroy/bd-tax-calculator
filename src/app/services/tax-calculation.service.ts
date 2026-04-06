import { Injectable } from '@angular/core';
import { TaxConfig, TaxInput, TaxResult, SlabBreakdown, SalaryPeriod, GrossSalaryBreakdown, GrossSalaryBreakdownItem, ExplanationStep } from '../models/tax.models';

@Injectable({ providedIn: 'root' })
export class TaxCalculationService {

  calculate(input: TaxInput, config: TaxConfig): TaxResult {
    // 1. Total Income
    const monthlySalaryIncome = this.calculateMonthlySalaryIncome(input);
    const yearlyBonus = input.yearlyBonus ?? 0;
    const salaryIncome = monthlySalaryIncome + yearlyBonus;
    const totalIncome = salaryIncome
      + input.rentalIncome
      + input.businessIncome
      + input.capitalGain
      + input.financialIncome
      + input.otherIncome;

    // 2. Tax-free threshold & taxable income
    const taxFreeThreshold = config.taxFreeThresholds[input.category];
    const taxableIncome = Math.max(0, totalIncome - taxFreeThreshold);

    // 3. Progressive slab tax
    const { slabBreakdown, grossTax } = this.applySlabs(taxableIncome, config);

    // 4. Investment limit
    const investmentPercentLimit  = config.investment.maxPercentOfIncome * totalIncome;
    const investmentAbsoluteLimit = config.investment.maxAbsoluteAmount;
    const eligibleInvestment = Math.min(
      input.investmentAmount,
      investmentPercentLimit,
      investmentAbsoluteLimit
    );

    // 5. Tax rebate
    const rawRebate = Math.min(
      eligibleInvestment * config.rebate.rate,
      config.rebate.maxPercentOfIncome * totalIncome,
      config.rebate.maxAbsoluteAmount
    );
    const rebate = Math.min(rawRebate, grossTax);

    const taxAfterRebate = grossTax - rebate;

    // 6. Minimum tax
    let payableTax = taxAfterRebate;
    let minimumTaxApplied = false;
    if (config.minimumTax.enabled && taxableIncome > 0 && taxAfterRebate < config.minimumTax.amount) {
      payableTax = config.minimumTax.amount;
      minimumTaxApplied = true;
    }

    // 7. Surcharge
    let surcharge = 0;
    if (input.netAssets > config.surcharge.threshold) {
      surcharge = grossTax * config.surcharge.rate;
    }

    // 8. Final tax
    const finalTax = Math.max(0, payableTax + surcharge);

    const explanations = this.buildExplanations(
      totalIncome, taxFreeThreshold, taxableIncome, slabBreakdown,
      grossTax,
      input.investmentAmount, investmentPercentLimit, investmentAbsoluteLimit,
      eligibleInvestment, config.rebate.rate, rebate,
      minimumTaxApplied, config.minimumTax.amount,
      surcharge, finalTax, monthlySalaryIncome, yearlyBonus
    );

    return {
      totalIncome,
      salaryIncome,
      monthlySalaryIncome,
      yearlyBonus,
      taxFreeThreshold,
      taxableIncome,
      slabBreakdown,
      grossTax,
      eligibleInvestment,
      rebate,
      taxAfterRebate,
      minimumTaxApplied,
      minimumTaxAmount: config.minimumTax.amount,
      payableTax,
      surcharge,
      finalTax,
      explanationEn: explanations.en,
      explanationBn: explanations.bn,
    };
  }

  computeGrossBreakdown(grossMonthly: number, config: TaxConfig): GrossSalaryBreakdown {
    const bd = config.salaryBreakdown;
    const limits = config.salaryLimits;

    const basicCalc      = grossMonthly * bd.basicPercent;
    const houseRentCalc  = grossMonthly * bd.houseRentPercent;
    const medicalCalc    = grossMonthly * bd.medicalPercent;
    const conveyanceCalc = grossMonthly * bd.conveyancePercent;
    const otherCalc      = grossMonthly * bd.otherPercent;

    const houseRentExempt = Math.min(
      houseRentCalc,
      basicCalc * limits.houseRent.maxPercentOfBasic,
      limits.houseRent.maxAbsolute
    );
    const medicalExempt = Math.min(
      medicalCalc,
      basicCalc * limits.medical.maxPercentOfBasic,
      limits.medical.maxAbsolute
    );
    const conveyanceExempt = Math.min(conveyanceCalc, limits.conveyance.exemptAmount);

    const make = (percent: number, calculated: number, exempt: number) => ({
      percent,
      calculated,
      exempt,
      taxable: calculated - exempt,
    });

    const basic      = make(bd.basicPercent,       basicCalc,      0);
    const houseRent  = make(bd.houseRentPercent,   houseRentCalc,  houseRentExempt);
    const medical    = make(bd.medicalPercent,      medicalCalc,    medicalExempt);
    const conveyance = make(bd.conveyancePercent,   conveyanceCalc, conveyanceExempt);
    const other      = make(bd.otherPercent,        otherCalc,      0);

    const totalCalculated = basicCalc + houseRentCalc + medicalCalc + conveyanceCalc + otherCalc;
    const totalExempt     = houseRentExempt + medicalExempt + conveyanceExempt;

    const item = (
      nameEn: string, nameBn: string,
      comp: typeof basic
    ): GrossSalaryBreakdownItem => ({
      nameEn,
      nameBn,
      percent: comp.percent,
      calculatedAmount: comp.calculated,
      allowedAmount: comp.exempt > 0 ? comp.exempt : comp.calculated,
      adjustmentApplied: comp.exempt > 0 && comp.exempt < comp.calculated,
    });

    const items: GrossSalaryBreakdownItem[] = [
      item('Basic',      'মূল বেতন',  basic),
      item('House Rent', 'বাড়ি ভাড়া', houseRent),
      item('Medical',    'চিকিৎসা',   medical),
      item('Conveyance', 'যাতায়াত',   conveyance),
      item('Other',      'অন্যান্য',   other),
    ];

    return {
      basic, houseRent, medical, conveyance, other,
      items,
      totalCalculated,
      totalExempt,
      totalTaxable: totalCalculated - totalExempt,
    };
  }

  grossBreakdownToSalaryPeriod(breakdown: GrossSalaryBreakdown, months: number): SalaryPeriod {
    // Use full calculated amounts — total must equal gross salary
    return {
      monthsWorked: months,
      monthlyBasic: breakdown.basic.calculated,
      monthlyHouseRent: breakdown.houseRent.calculated,
      monthlyMedical: breakdown.medical.calculated,
      monthlyConveyance: breakdown.conveyance.calculated,
      monthlyOther: breakdown.other.calculated,
    };
  }

  private calculateMonthlySalaryIncome(input: TaxInput): number {
    return input.salaryPeriods.reduce((sum, p) => {
      const monthly = p.monthlyBasic + p.monthlyHouseRent + p.monthlyMedical
        + p.monthlyConveyance + p.monthlyOther;
      return sum + monthly * p.monthsWorked;
    }, 0);
  }

  private applySlabs(taxableIncome: number, config: TaxConfig): { slabBreakdown: SlabBreakdown[], grossTax: number } {
    const slabBreakdown: SlabBreakdown[] = [];
    let remaining = taxableIncome;
    let grossTax = 0;
    let slabStart = 0;

    for (let i = 0; i < config.slabs.length; i++) {
      if (remaining <= 0) break;
      const slab = config.slabs[i];
      const applyAmount = slab.limit === Infinity ? remaining : Math.min(remaining, slab.limit);
      const tax = applyAmount * slab.rate;
      grossTax += tax;

      const slabEnd = slab.limit === Infinity ? null : slabStart + slab.limit;
      slabBreakdown.push({
        slabIndex: i,
        rangeEn: this.slabRangeEn(slabStart, slabEnd, slab.rate),
        rangeBn: this.slabRangeBn(slabStart, slabEnd, slab.rate),
        rate: slab.rate,
        taxableAmount: applyAmount,
        tax,
      });

      remaining -= applyAmount;
      slabStart += slab.limit === Infinity ? applyAmount : slab.limit;
    }

    return { slabBreakdown, grossTax };
  }

  private slabRangeEn(start: number, end: number | null, rate: number): string {
    if (rate === 0) return `First ৳${this.fmt(start + (end! - start))} — Tax Free`;
    if (end === null) return `Above ৳${this.fmt(start)}`;
    return `Next ৳${this.fmt(end - start)} (${this.fmt(start + 1)}–${this.fmt(end)})`;
  }

  private slabRangeBn(start: number, end: number | null, rate: number): string {
    if (rate === 0) return `প্রথম ৳${this.fmtBn(end! - start)} টাকার উপর কর নেই`;
    if (end === null) return `৳${this.fmtBn(start)} এর উপর`;
    return `পরবর্তী ৳${this.fmtBn(end - start)} টাকার উপর`;
  }

  private buildExplanations(
    totalIncome: number, threshold: number, taxableIncome: number,
    slabs: SlabBreakdown[], grossTax: number,
    actualInvestment: number, investmentPercentLimit: number, investmentAbsoluteLimit: number,
    eligibleInvestment: number, rebateRate: number, rebate: number,
    minimumTaxApplied: boolean, minimumTaxAmount: number,
    surcharge: number, finalTax: number,
    monthlySalaryIncome: number, yearlyBonus: number
  ): { en: ExplanationStep[], bn: ExplanationStep[] } {
    const en: ExplanationStep[] = [];
    const bn: ExplanationStep[] = [];

    en.push({ text: `Total Income: ৳${this.fmt(totalIncome)}` });
    bn.push({ text: `মোট আয়: ৳${this.fmtBn(totalIncome)}` });

    if (yearlyBonus > 0) {
      en.push({ text: `Yearly bonus of ৳${this.fmt(yearlyBonus)} has been included in salary income.` });
      bn.push({ text: `বার্ষিক বোনাস ৳${this.fmtBn(yearlyBonus)} বেতন আয়ের অন্তর্ভুক্ত করা হয়েছে।` });
    }

    en.push({ text: `Tax-Free Threshold: ৳${this.fmt(threshold)}` });
    bn.push({ text: `করমুক্ত সীমা: ৳${this.fmtBn(threshold)}` });

    en.push({ text: `Taxable Income: ৳${this.fmt(taxableIncome)}` });
    bn.push({ text: `করযোগ্য আয়: ৳${this.fmtBn(taxableIncome)}` });

    slabs.forEach(s => {
      const pct = `${s.rate * 100}%`;
      en.push({ text: s.rangeEn + ` @ ${pct} → Tax: ৳${this.fmt(s.tax)}` });
      bn.push({ text: s.rangeBn + ` @ ${pct} → কর: ৳${this.fmtBn(s.tax)}` });
    });

    en.push({ text: `Gross Tax: ৳${this.fmt(grossTax)}` });
    bn.push({ text: `মোট কর: ৳${this.fmtBn(grossTax)}` });

    if (actualInvestment > 0) {
      const pct = Math.round(rebateRate * 100);
      const candidates = [actualInvestment, investmentPercentLimit, investmentAbsoluteLimit];
      const minIdx = candidates.indexOf(Math.min(...candidates));

      const enSubs: string[] = [
        `Eligible investment = min of three limits:`,
        `  (a) Actual investment: ৳${this.fmt(actualInvestment)}${minIdx === 0 ? ' ✓ lowest' : ''}`,
        `  (b) ${Math.round(investmentPercentLimit / totalIncome * 100)}% of total income (৳${this.fmt(totalIncome)} × ${Math.round(investmentPercentLimit / totalIncome * 100)}%): ৳${this.fmt(investmentPercentLimit)}${minIdx === 1 ? ' ✓ lowest' : ''}`,
        `  (c) Absolute cap: ৳${this.fmt(investmentAbsoluteLimit)}${minIdx === 2 ? ' ✓ lowest' : ''}`,
        `→ Eligible Investment = ৳${this.fmt(eligibleInvestment)}`,
        `Rebate = ৳${this.fmt(eligibleInvestment)} × ${pct}% = ৳${this.fmt(rebate)}`,
      ];

      const bnSubs: string[] = [
        `যোগ্য বিনিয়োগ = নিচের তিনটির সর্বনিম্ন:`,
        `  (ক) প্রকৃত বিনিয়োগ: ৳${this.fmtBn(actualInvestment)}${minIdx === 0 ? ' ✓ সর্বনিম্ন' : ''}`,
        `  (খ) মোট আয়ের ${Math.round(investmentPercentLimit / totalIncome * 100)}% (৳${this.fmtBn(totalIncome)} × ${Math.round(investmentPercentLimit / totalIncome * 100)}%): ৳${this.fmtBn(investmentPercentLimit)}${minIdx === 1 ? ' ✓ সর্বনিম্ন' : ''}`,
        `  (গ) সর্বোচ্চ সীমা: ৳${this.fmtBn(investmentAbsoluteLimit)}${minIdx === 2 ? ' ✓ সর্বনিম্ন' : ''}`,
        `→ যোগ্য বিনিয়োগ = ৳${this.fmtBn(eligibleInvestment)}`,
        `রেয়াত = ৳${this.fmtBn(eligibleInvestment)} × ${pct}% = ৳${this.fmtBn(rebate)}`,
      ];

      en.push({ text: `Investment Rebate: –৳${this.fmt(rebate)}`, subItems: enSubs });
      bn.push({ text: `বিনিয়োগ রেয়াত: –৳${this.fmtBn(rebate)}`, subItems: bnSubs });
    }

    if (minimumTaxApplied) {
      en.push({ text: `Minimum Tax Applied: ৳${this.fmt(minimumTaxAmount)}` });
      bn.push({ text: `সর্বনিম্ন কর প্রযোজ্য: ৳${this.fmtBn(minimumTaxAmount)}` });
    }

    if (surcharge > 0) {
      en.push({ text: `Surcharge: ৳${this.fmt(surcharge)}` });
      bn.push({ text: `সারচার্জ: ৳${this.fmtBn(surcharge)}` });
    }

    en.push({ text: `Final Tax Payable: ৳${this.fmt(finalTax)}` });
    bn.push({ text: `প্রদেয় চূড়ান্ত কর: ৳${this.fmtBn(finalTax)}` });

    return { en, bn };
  }

  private fmt(n: number): string {
    return Math.round(n).toLocaleString('en-IN');
  }

  private fmtBn(n: number): string {
    return Math.round(n).toLocaleString('en-IN');
  }
}
