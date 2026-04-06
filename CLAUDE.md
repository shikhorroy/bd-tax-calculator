# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A configurable Bangladesh Income Tax Calculator (2025–2026) built with Angular. Features bilingual UI (English + Bangla), smart fiscal year auto-detection, and a strict multi-step tax calculation engine following Bangladesh Income Tax rules.

## Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:4200)
ng serve

# Build for production
ng build

# Run unit tests
ng test

# Run a single test file
ng test --include="**/tax-calculation.service.spec.ts"

# Lint
ng lint
```

## Architecture

### Tech Stack
- Angular 19 with standalone components
- TypeScript
- SCSS for styles
- Reactive Forms

### Key Domain Concepts

**Tax Year:**
- Fiscal Year = Income Year (আয় বছর): July–June cycle
- Assessment Year (করবর্ষ): fiscal year + 1
- Auto-detection: if current month ≥ July → fiscal year starts current year; else starts previous year
- User can override via dropdown (last 5–10 years)

**Tax Calculation Pipeline (must follow this exact order):**
1. Total Income = salary + rental + business + capital gain + financial + other
2. Taxable Income = max(0, totalIncome − threshold) — threshold varies by taxpayer category
3. Progressive slab tax — apply slabs sequentially from config, never hardcode
4. Investment rebate — min(eligible investment × rate, maxPercent × income, maxAbsolute); cannot exceed gross tax
5. Minimum tax — payable = max(grossTax − rebate, minimumTax.amount)
6. Surcharge — applied if net assets exceed threshold: grossTax × surcharge.rate
7. Final tax = max(0, payable + surcharge)

**Taxpayer Categories & Thresholds:**
- General: 350,000 BDT
- Female / Senior (65+): 400,000 BDT
- Disabled: 475,000 BDT
- Freedom Fighter: 500,000 BDT

**Default Tax Slabs (from config, not hardcoded):**
| Limit | Rate |
|-------|------|
| 350,000 | 0% |
| 100,000 | 5% |
| 400,000 | 10% |
| 500,000 | 15% |
| 500,000 | 20% |
| 2,000,000 | 25% |
| ∞ | 30% |

### File Structure

```
src/app/
  models/tax.models.ts          — all interfaces (TaxConfig, TaxInput, TaxResult, etc.)
  services/
    tax-year.service.ts         — fiscal year detection + signals for selected/available years
    tax-config.service.ts       — computed TaxConfig signal (reacts to year changes)
    tax-calculation.service.ts  — pure calculation logic (no state)
  components/
    year-selector/              — year picker UI + assessment year display
    tax-form/                   — reactive form for all income inputs
    tax-result/                 — result breakdown + bilingual explanation
```

### Service Structure

- **`TaxYearService`** — detects current fiscal year via `signal`, provides `availableYears` computed list
- **`TaxCalculationService`** — pure calculation logic; takes `TaxInput` + `TaxConfig`, returns `TaxResult`
- **`TaxConfigService`** — `computed` signal that builds `TaxConfig` from the selected year in `TaxYearService`

### Data Models

**`TaxConfig`:**
```typescript
{
  taxYear: { fiscalYearStart, fiscalYearEnd, assessmentYearStart, assessmentYearEnd },
  taxFreeThresholds: { general, female, disabled, freedomFighter },
  slabs: Array<{ limit: number, rate: number }>,
  investment: { maxPercentOfIncome, maxAbsoluteAmount },
  rebate: { rate, maxPercentOfIncome, maxAbsoluteAmount },
  minimumTax: { enabled, amount },
  surcharge: { threshold, rate }
}
```

**`TaxResult`:**
```typescript
{
  totalIncome, taxableIncome,
  slabBreakdown: Array<{ range, rate, tax }>,
  grossTax, rebate, minimumTaxApplied, surcharge, finalTax,
  explanationEn: string[], explanationBn: string[]
}
```

### Validation Rules
- `taxableIncome` cannot be negative
- `rebate` cannot exceed `grossTax`
- Total salary months ≤ 12
- No overlapping salary periods

### Bilingual Requirements
All labels, explanations, and helper text must appear in both English and Bangla. Key terms:
- Fiscal Year = আয় বছর
- Assessment Year = করবর্ষ
- Tax Year Settings = করবর্ষ সেটিংস
- Helper text: "কর গণনা এই সময়ের আয়ের উপর ভিত্তি করে করা হচ্ছে"

### Config-Driven Design
Tax slabs, thresholds, investment limits, and rebate rules must come from `TaxConfig` — never hardcoded in calculation logic. This allows different configs per tax year.
