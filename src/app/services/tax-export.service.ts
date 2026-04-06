import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TaxResult } from '../models/tax.models';

@Injectable({ providedIn: 'root' })
export class TaxExportService {

  private fmt(n: number): string {
    return Math.round(n).toLocaleString('en-IN');
  }

  private pct(rate: number): string {
    return `${rate * 100}%`;
  }

  private getFilename(ext: string): string {
    return `tax-calculation-${new Date().toISOString().slice(0, 10)}.${ext}`;
  }

  /** Replace Unicode chars unsupported by jsPDF built-in fonts */
  private clean(text: string): string {
    return text
      .replace(/৳/g, 'BDT')
      .replace(/[–—]/g, '-')
      .replace(/[^\x00-\x7F]/g, '');
  }

  exportPDF(result: TaxResult, fiscalYear: string): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Bangladesh Income Tax Calculation', pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Fiscal Year: ${fiscalYear}`, pageW / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 10;

    // Summary
    autoTable(doc, {
      startY: y,
      head: [['Summary', '']],
      body: [
        ['Total Income',             `BDT ${this.fmt(result.totalIncome)}`],
        ['Tax-Free Threshold',       `BDT ${this.fmt(result.taxFreeThreshold)}`],
        ['Taxable Income',           `BDT ${this.fmt(result.taxableIncome)}`],
        ['Gross Tax',                `BDT ${this.fmt(result.grossTax)}`],
        ['Investment Rebate',        `- BDT ${this.fmt(result.rebate)}`],
        ['Tax After Rebate',         `BDT ${this.fmt(result.taxAfterRebate)}`],
        ...(result.surcharge > 0 ? [['Surcharge', `BDT ${this.fmt(result.surcharge)}`]] : []),
        ['Final Tax Payable',        `BDT ${this.fmt(result.finalTax)}`],
        ['Monthly Deduction (avg)',  `BDT ${this.fmt(result.finalTax / 12)}`],
      ],
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
      headStyles: { fillColor: [26, 107, 60] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Slab breakdown
    autoTable(doc, {
      startY: y,
      head: [['Tax Slab', 'Rate', 'Taxable Amount', 'Tax']],
      body: result.slabBreakdown.map(s => [
        this.clean(s.rangeEn),
        this.pct(s.rate),
        `BDT ${this.fmt(s.taxableAmount)}`,
        `BDT ${this.fmt(s.tax)}`,
      ]),
      headStyles: { fillColor: [26, 107, 60] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Step-by-step explanation via autoTable for consistent layout
    const expRows: string[][] = [];
    result.explanationEn.forEach((step, i) => {
      expRows.push([`${i + 1}.`, this.clean(step.text)]);
      (step.subItems ?? []).forEach(sub => expRows.push(['', this.clean(sub)]));
    });

    autoTable(doc, {
      startY: y,
      head: [['#', 'Step-by-Step Explanation']],
      body: expRows,
      headStyles: { fillColor: [26, 107, 60] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 'auto', fontSize: 8 },
      },
      styles: { overflow: 'linebreak', cellPadding: 2.5 },
      bodyStyles: { fontSize: 8.5 },
      didParseCell: (data) => {
        // indent sub-items (empty # column)
        if (data.column.index === 1 && data.row.index > 0) {
          const prevRow = expRows[data.row.index - 1];
          if (data.cell.raw !== '' && expRows[data.row.index][0] === '') {
            data.cell.styles.textColor = [80, 80, 80];
            data.cell.styles.fontStyle = 'italic';
          }
        }
      },
    });

    doc.save(this.getFilename('pdf'));
  }
}
