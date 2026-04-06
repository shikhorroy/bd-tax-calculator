import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxYearService, FiscalYear } from '../../services/tax-year.service';

@Component({
  selector: 'app-year-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './year-selector.component.html',
  styleUrls: ['./year-selector.component.scss'],
})
export class YearSelectorComponent {
  readonly taxYearService = inject(TaxYearService);

  get selectedYearLabel(): string {
    return this.taxYearService.selectedYear().labelEn;
  }

  onYearChange(labelEn: string): void {
    const found = this.taxYearService.availableYears().find(y => y.labelEn === labelEn);
    if (found) this.taxYearService.selectYear(found);
  }

  trackYear(_: number, y: FiscalYear): string {
    return y.labelEn;
  }
}
