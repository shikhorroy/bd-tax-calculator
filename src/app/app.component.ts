import { Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { YearSelectorComponent } from './components/year-selector/year-selector.component';
import { TaxFormComponent } from './components/tax-form/tax-form.component';
import { TaxResultComponent } from './components/tax-result/tax-result.component';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxConfigService } from './services/tax-config.service';
import { TaxInput, TaxResult } from './models/tax.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, YearSelectorComponent, TaxFormComponent, TaxResultComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly calcService = inject(TaxCalculationService);
  private readonly configService = inject(TaxConfigService);

  readonly result: WritableSignal<TaxResult>;

  constructor() {
    const defaultInput: TaxInput = {
      category: 'general',
      salaryPeriods: [{ monthsWorked: 12, monthlyBasic: 0, monthlyHouseRent: 0, monthlyMedical: 0, monthlyConveyance: 0, monthlyOther: 0 }],
      yearlyBonus: 0, rentalIncome: 0, businessIncome: 0,
      capitalGain: 0, financialIncome: 0, otherIncome: 0,
      investmentAmount: 0, netAssets: 0,
    };
    this.result = signal(this.calcService.calculate(defaultInput, this.configService.config()));
  }

  onCalculate(input: TaxInput): void {
    this.result.set(this.calcService.calculate(input, this.configService.config()));
  }
}
