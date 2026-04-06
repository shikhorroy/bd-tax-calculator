import { Injectable, signal, computed } from '@angular/core';

export interface FiscalYear {
  fiscalYearStart: number;
  fiscalYearEnd: number;
  assessmentYearStart: number;
  assessmentYearEnd: number;
  labelEn: string;
  labelBn: string;
}

@Injectable({ providedIn: 'root' })
export class TaxYearService {
  private readonly detectedYear = this.detectCurrentFiscalYear();

  readonly selectedYear = signal<FiscalYear>(this.detectedYear);
  readonly availableYears = computed(() => this.buildYearList());

  detectCurrentFiscalYear(): FiscalYear {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-indexed
    const year = now.getFullYear();

    const fiscalStart = month >= 7 ? year : year - 1;
    const fiscalEnd = fiscalStart + 1;

    return this.buildFiscalYear(fiscalStart, fiscalEnd);
  }

  private buildFiscalYear(fiscalStart: number, fiscalEnd: number): FiscalYear {
    const assessStart = fiscalEnd;
    const assessEnd = fiscalEnd + 1;
    return {
      fiscalYearStart: fiscalStart,
      fiscalYearEnd: fiscalEnd,
      assessmentYearStart: assessStart,
      assessmentYearEnd: assessEnd,
      labelEn: `${fiscalStart}–${fiscalEnd}`,
      labelBn: `${fiscalStart}–${fiscalEnd}`,
    };
  }

  private buildYearList(): FiscalYear[] {
    const detected = this.detectCurrentFiscalYear();
    const years: FiscalYear[] = [];
    // Last 5 years including current
    for (let i = 4; i >= 0; i--) {
      const start = detected.fiscalYearStart - i;
      years.push(this.buildFiscalYear(start, start + 1));
    }
    return years;
  }

  selectYear(year: FiscalYear): void {
    this.selectedYear.set(year);
  }
}
