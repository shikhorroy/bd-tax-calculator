import {Injectable, computed, inject} from '@angular/core';
import {TaxConfig} from '../models/tax.models';
import {TaxYearService} from './tax-year.service';

@Injectable({providedIn: 'root'})
export class TaxConfigService {
  private readonly taxYearService = inject(TaxYearService);

  readonly config = computed<TaxConfig>(() => {
    const year = this.taxYearService.selectedYear();
    return this.buildConfig(year.fiscalYearStart, year.fiscalYearEnd);
  });

  private buildConfig(fiscalStart: number, fiscalEnd: number): TaxConfig {
    return {
      taxYear: {
        fiscalYearStart: fiscalStart,
        fiscalYearEnd: fiscalEnd,
        assessmentYearStart: fiscalEnd,
        assessmentYearEnd: fiscalEnd + 1,
      },
      taxFreeThresholds: {
        general: 375000,
        female: 425000,
        disabled: 500000,
        freedom_fighter: 525000,
      },

      slabs: [
        {limit: 375000, rate: 0},
        {limit: 300000, rate: 0.10},
        {limit: 400000, rate: 0.15},
        {limit: 500000, rate: 0.20},
        {limit: 2000000, rate: 0.25},
        {limit: Infinity, rate: 0.30},
      ],

      investment: {
        maxPercentOfIncome: 0.25,
        maxAbsoluteAmount: 1500000,
      },

      rebate: {
        rate: 0.15,
        maxPercentOfIncome: 0.03,
        maxAbsoluteAmount: 1000000,
      },

      minimumTax: {
        enabled: true,
        amount: 5000,
      },

      surcharge: {
        threshold: 40000000,
        rate: 0.10,
      },

      salaryBreakdown: {
        basicPercent: 0.50,
        houseRentPercent: 0.30,
        medicalPercent: 0.10,
        conveyancePercent: 0.05,
        otherPercent: 0.05,
      },

      salaryLimits: {
        houseRent: {
          maxPercentOfBasic: 0.50,
          maxAbsolute: 25000,
        },
        medical: {
          maxPercentOfBasic: 0.10,
          maxAbsolute: 10000,
        },
        conveyance: {
          exemptAmount: 2500,
        }
      },
    };
  }
}
