import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { TaxInput, TaxpayerCategory } from '../../models/tax.models';
import { TaxConfigService } from '../../services/tax-config.service';
import { TaxCalculationService } from '../../services/tax-calculation.service';

@Component({
  selector: 'app-tax-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tax-form.component.html',
  styleUrls: ['./tax-form.component.scss'],
})
export class TaxFormComponent {
  readonly calculate = output<TaxInput>();

  private readonly fb = inject(FormBuilder);
  private readonly taxConfigService = inject(TaxConfigService);
  private readonly taxCalcService = inject(TaxCalculationService);

  readonly validationErrors = signal<string[]>([]);

  readonly form = this.fb.group({
    category: ['general' as TaxpayerCategory, Validators.required],
    salaryPeriods: this.fb.array([this.createSalaryPeriod()]),
    yearlyBonus: [0, [Validators.min(0)]],
    rentalIncome: [0, [Validators.min(0)]],
    businessIncome: [0, [Validators.min(0)]],
    capitalGain: [0, [Validators.min(0)]],
    financialIncome: [0, [Validators.min(0)]],
    otherIncome: [0, [Validators.min(0)]],
    investmentAmount: [0, [Validators.min(0)]],
    netAssets: [0, [Validators.min(0)]],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.value,
  });

  /** Per-period gross breakdown — null for periods in detailed mode or with no gross value */
  readonly periodBreakdowns = computed(() => {
    const periods = (this.formValue()?.salaryPeriods ?? []) as any[];
    const config = this.taxConfigService.config();
    return periods.map(p => {
      if (p.mode !== 'gross' || +(p.grossMonthly ?? 0) <= 0) return null;
      return this.taxCalcService.computeGrossBreakdown(+(p.grossMonthly), config);
    });
  });

  constructor() {
    this.form.valueChanges.pipe(
      debounceTime(300),
      takeUntilDestroyed()
    ).subscribe(() => this.emitCalculation());
  }

  get salaryPeriods(): FormArray {
    return this.form.get('salaryPeriods') as FormArray;
  }

  createSalaryPeriod() {
    return this.fb.group({
      mode: ['gross'],
      monthsWorked: [12, [Validators.required, Validators.min(1), Validators.max(12)]],
      // detailed fields
      monthlyBasic: [0, [Validators.min(0)]],
      monthlyHouseRent: [0, [Validators.min(0)]],
      monthlyMedical: [0, [Validators.min(0)]],
      monthlyConveyance: [0, [Validators.min(0)]],
      monthlyOther: [0, [Validators.min(0)]],
      // gross field
      grossMonthly: [0, [Validators.min(0)]],
    });
  }

  addSalaryPeriod(): void {
    if (this.salaryPeriods.length < 3) {
      this.salaryPeriods.push(this.createSalaryPeriod());
    }
  }

  removeSalaryPeriod(index: number): void {
    if (this.salaryPeriods.length > 1) {
      this.salaryPeriods.removeAt(index);
    }
  }

  setPeriodMode(index: number, mode: 'detailed' | 'gross'): void {
    this.salaryPeriods.at(index).get('mode')!.setValue(mode);
  }

  fmt(n: number): string {
    return Math.round(n).toLocaleString('en-IN');
  }

  private emitCalculation(): void {
    this.validationErrors.set(this.validateInput());
    this.calculate.emit(this.buildTaxInput());
  }

  private buildTaxInput(): TaxInput {
    const v = this.form.value;
    const config = this.taxConfigService.config();
    const salaryPeriods = (v.salaryPeriods as any[]).map(p => {
      const months = +p.monthsWorked;
      if (p.mode === 'gross') {
        const bd = this.taxCalcService.computeGrossBreakdown(+(p.grossMonthly ?? 0), config);
        return this.taxCalcService.grossBreakdownToSalaryPeriod(bd, months);
      }
      return {
        monthsWorked: months,
        monthlyBasic: +p.monthlyBasic,
        monthlyHouseRent: +p.monthlyHouseRent,
        monthlyMedical: +p.monthlyMedical,
        monthlyConveyance: +p.monthlyConveyance,
        monthlyOther: +p.monthlyOther,
      };
    });
    return {
      category: v.category as TaxpayerCategory,
      salaryPeriods,
      yearlyBonus: +(v.yearlyBonus ?? 0),
      rentalIncome: +v.rentalIncome!,
      businessIncome: +v.businessIncome!,
      capitalGain: +v.capitalGain!,
      financialIncome: +v.financialIncome!,
      otherIncome: +v.otherIncome!,
      investmentAmount: +v.investmentAmount!,
      netAssets: +v.netAssets!,
    };
  }

  private validateInput(): string[] {
    const errors: string[] = [];
    const periods = this.salaryPeriods.value as any[];

    const totalMonths = periods.reduce((sum: number, p: any) => sum + +p.monthsWorked, 0);
    if (totalMonths > 12) {
      errors.push(`Total salary months (${totalMonths}) cannot exceed 12. / মোট বেতনের মাস ১২ এর বেশি হতে পারবে না।`);
    }

    periods.forEach((p, i) => {
      if (p.mode === 'gross' && +(p.grossMonthly ?? 0) <= 0) {
        errors.push(`Period ${i + 1}: Gross salary must be a positive number. / পিরিয়ড ${i + 1}: মোট বেতন অবশ্যই ধনাত্মক সংখ্যা হতে হবে।`);
      }
    });

    return errors;
  }
}
