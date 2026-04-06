import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaxResult } from '../../models/tax.models';
import { TaxExportService } from '../../services/tax-export.service';
import { TaxYearService } from '../../services/tax-year.service';

@Component({
  selector: 'app-tax-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tax-result.component.html',
  styleUrls: ['./tax-result.component.scss'],
})
export class TaxResultComponent {
  readonly result = input.required<TaxResult>();
  readonly explanationTab = signal<'en' | 'bn'>('en');
  readonly salaryExpanded = signal(false);

  private readonly exportService = inject(TaxExportService);
  private readonly taxYearService = inject(TaxYearService);

  downloadPDF(): void {
    const year = this.taxYearService.selectedYear().labelEn;
    this.exportService.exportPDF(this.result(), year);
  }


  fmt(n: number): string {
    return Math.round(n).toLocaleString('en-IN');
  }

  pct(rate: number): string {
    return `${rate * 100}%`;
  }
}
