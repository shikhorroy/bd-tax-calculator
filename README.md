# Bangladesh Income Tax Calculator 2025–2026

A configurable, bilingual (English + বাংলা) income tax calculator for Bangladesh, built with **Angular 19**. It follows the Bangladesh National Board of Revenue (NBR) tax rules for the fiscal year 2025–2026 and auto-detects the current fiscal year on load.

---

## Table of Contents

1. [Live Features](#live-features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Application Layout](#application-layout)
6. [Components In Detail](#components-in-detail)
   - [App Shell](#1-app-shell-appcomponent)
   - [Year Selector](#2-year-selector-yearselectorcomponent)
   - [Tax Form](#3-tax-form-taxformcomponent)
   - [Tax Result](#4-tax-result-taxresultcomponent)
7. [Services](#services)
   - [TaxYearService](#taxyearservice)
   - [TaxConfigService](#taxconfigservice)
   - [TaxCalculationService](#taxcalculationservice)
   - [TaxExportService](#taxexportservice)
8. [Data Models](#data-models)
9. [Tax Calculation Rules](#tax-calculation-rules)
   - [Taxpayer Categories & Thresholds](#taxpayer-categories--thresholds)
   - [Salary Component Exemptions](#salary-component-exemptions)
   - [Progressive Tax Slabs](#progressive-tax-slabs)
   - [Investment Rebate](#investment-rebate)
   - [Minimum Tax](#minimum-tax)
   - [Surcharge](#surcharge)
   - [Final Tax Formula](#final-tax-formula)
10. [Bilingual Support](#bilingual-support)
11. [PDF Export](#pdf-export)

---

## Live Features

- Auto-detects current Bangladesh fiscal year (July–June cycle)
- Supports multiple salary periods (up to 3 jobs/employers in one year)
- Dual salary input mode: **Gross** (auto-breakdown) or **Detailed** (component-wise)
- Real-time tax calculation with 300 ms debounce
- Progressive tax slab breakdown table
- Investment rebate, minimum tax, and surcharge calculations
- Step-by-step bilingual explanation (English + বাংলা)
- PDF export of full tax report
- Fully responsive — works on mobile and desktop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 19 (Standalone Components) |
| Language | TypeScript |
| Styles | SCSS with CSS Custom Properties |
| Forms | Angular Reactive Forms |
| State | Angular Signals (`signal`, `computed`) |
| PDF Export | jsPDF + jspdf-autotable |

---

## Project Structure

```
src/app/
├── models/
│   └── tax.models.ts                 — All TypeScript interfaces and types
├── services/
│   ├── tax-year.service.ts           — Fiscal year detection + available year list
│   ├── tax-config.service.ts         — Tax config signal for selected year
│   ├── tax-calculation.service.ts    — Core tax calculation engine (pure, stateless)
│   └── tax-export.service.ts         — PDF generation and download
└── components/
    ├── year-selector/                — Year picker UI
    │   ├── year-selector.component.ts
    │   ├── year-selector.component.html
    │   └── year-selector.component.scss
    ├── tax-form/                     — Income input form
    │   ├── tax-form.component.ts
    │   ├── tax-form.component.html
    │   └── tax-form.component.scss
    └── tax-result/                   — Tax result display
        ├── tax-result.component.ts
        ├── tax-result.component.html
        └── tax-result.component.scss
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (http://localhost:4200)
ng serve

# Build for production
ng build

# Run unit tests
ng test

# Run a specific test file
ng test --include="**/tax-calculation.service.spec.ts"

# Lint
ng lint
```

---

## Application Layout

The app is a **single page** with a sticky header, a two-column content grid, and a footer.

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: 🇧🇩 Bangladesh Tax Calculator        [2025–2026]    │
├─────────────────────────────┬───────────────────────────────┤
│  LEFT COLUMN (Form)         │  RIGHT COLUMN (Result)        │
│                             │                               │
│  ┌─────────────────────┐    │  ┌─────────────────────────┐  │
│  │  Year Selector      │    │  │  Summary Banner         │  │
│  └─────────────────────┘    │  │  Income Breakdown       │  │
│  ┌─────────────────────┐    │  │  Tax Slab Table         │  │
│  │  Tax Form           │    │  │  Tax Computation Table  │  │
│  │  - Category         │    │  │  Explanation (En/Bn)    │  │
│  │  - Salary Periods   │    │  │  PDF Download           │  │
│  │  - Other Income     │    │  └─────────────────────────┘  │
│  │  - Investment       │    │                               │
│  └─────────────────────┘    │                               │
├─────────────────────────────┴───────────────────────────────┤
│  FOOTER: Based on Bangladesh Income Tax Rules 2025–2026     │
└─────────────────────────────────────────────────────────────┘
```

On mobile (<900px), both columns stack vertically. The form is shown first, then the result below it.

---

## Components In Detail

### 1. App Shell (`AppComponent`)

**Files:** `app.component.ts` | `app.component.html` | `app.component.scss`

The root component. It wires all child components together and holds the reactive `result` signal.

**What it does:**
- Renders the sticky header with the app title and current fiscal year badge
- Hosts the two-column layout grid
- Holds `result: WritableSignal<TaxResult | null>` — updated every time the form changes
- On `(calculate)` event from the Tax Form, calls `TaxCalculationService.calculate()` and writes into `result`
- Passes `result()` down to `TaxResultComponent` as an `@Input`

**Header contents:**

| Element | Content |
|---|---|
| Logo / Brand | 🇧🇩 Bangladesh Tax Calculator |
| Year badge | 2025–2026 (dynamically shows selected fiscal year) |

**Footer:**
> Based on Bangladesh Income Tax Rules 2025–2026

---

### 2. Year Selector (`YearSelectorComponent`)

**Files:** `year-selector.component.ts` | `year-selector.component.html` | `year-selector.component.scss`

A card that lets the user pick the fiscal year for which tax is being calculated.

#### UI Layout

```
┌──────────────────────────────────────────────────────┐
│  Tax Year Settings (করবর্ষ সেটিংস)                      │
│                                                      │
│  ┌───────────────────────┐  ┌──────────────────────┐ │
│  │ Fiscal Year           │  │ Assessment Year      │ │
│  │ আয় বছর               │  │ করবর্ষ                 │ │
│  │ [Dropdown ▼]          │  │ 2026–2027 (readonly) │ │
│  └───────────────────────┘  └──────────────────────┘ │
│                                                      │
│  ℹ Tax is being calculated based on income for       │
│    this period.                                      │
│    (কর গণনা এই সময়ের আয়ের উপর ভিত্তি করে...)          │
└──────────────────────────────────────────────────────┘
```

#### Fields

| Field | Type | Description |
|---|---|---|
| Fiscal Year (আয় বছর) | `<select>` dropdown | Lists last 5 fiscal years. Defaults to auto-detected current year. Each option shows `YYYY–YYYY (Jul–Jun)` |
| Assessment Year (করবর্ষ) | Read-only display | Auto-calculated as `fiscalYearEnd – (fiscalYearEnd + 1)`. Not editable. |

#### Fiscal Year Auto-Detection Logic
- If current month **≥ July** → fiscal year starts current calendar year
- If current month **< July** → fiscal year started previous calendar year
- Example: April 2026 → Fiscal Year 2025–2026, Assessment Year 2026–2027

#### Dropdown Options (as of 2026)
```
2025–2026 (Jul–Jun)  ← current, auto-selected
2024–2025 (Jul–Jun)
2023–2024 (Jul–Jun)
2022–2023 (Jul–Jun)
2021–2022 (Jul–Jun)
```

---

### 3. Tax Form (`TaxFormComponent`)

**Files:** `tax-form.component.ts` | `tax-form.component.html` | `tax-form.component.scss`

The main input form. Uses Angular **Reactive Forms** with a `FormArray` for salary periods. Emits a `(calculate)` event with a `TaxInput` object on every value change (debounced 300 ms).

#### Section A — Taxpayer Category

```
┌──────────────────────────────────────────────────────────────┐
│  Taxpayer Category (করদাতার ধরন)                              │
│                                                              │
│  ◉ General (সাধারণ)      ○ Female / Senior (নারী / প্রবীণ)       │
│  ○ Disabled (প্রতিবন্ধী)  ○ Freedom Fighter (মুক্তিযোদ্ধা)            │
└──────────────────────────────────────────────────────────────┘
```

| Option | Value | Tax-Free Threshold |
|---|---|---|
| General (সাধারণ) | `general` | ৳3,75,000 |
| Female / Senior 65+ (নারী / প্রবীণ) | `female` | ৳4,25,000 |
| Disabled (প্রতিবন্ধী) | `disabled` | ৳5,00,000 |
| Freedom Fighter (মুক্তিযোদ্ধা) | `freedom_fighter` | ৳5,25,000 |

Selecting a different category immediately recalculates tax (via the debounced emitter).

---

#### Section B — Salary Income (সেলারি আয়)

Supports up to **3 salary periods** (e.g., for people who changed jobs mid-year). Each period is a collapsible card with a dashed border.

##### Period Header

```
Period 1 of 2
[×  Remove Period]
```

##### Input Mode Toggle

Each period has a mode toggle button group:

```
[ Gross Mode ]  [ Detailed Mode ]
```

---

##### Gross Mode (default)

Enter a single gross monthly salary figure. The app automatically breaks it into components.

| Field | Label (En) | Label (Bn) | Type |
|---|---|---|---|
| Gross Monthly Salary | Gross Monthly | মোট মাসিক | Number input |
| Months Worked | Months Worked | কাজের মাস | Number input (1–12) |

**Auto-Breakdown Preview Table** (shown when gross > 0):

When a gross figure is entered, the form shows a read-only breakdown table:

```
┌────────────────┬──────────┬────────────┬─────────────┬──────────┐
│ Component      │ %        │ Calculated │ Allowed     │ Taxable  │
├────────────────┼──────────┼────────────┼─────────────┼──────────┤
│ Basic          │ 50%      │ ৳25,000    │ ৳25,000     │ ৳25,000  │
│ House Rent     │ 30%      │ ৳15,000    │ ৳12,500 ⚠   │ ৳2,500   │
│ Medical        │ 10%      │ ৳5,000     │ ৳2,500 ⚠    │ ৳2,500   │
│ Conveyance     │  5%      │ ৳2,500     │ ৳2,500      │ ৳0       │
│ Other          │  5%      │ ৳2,500     │ ৳2,500      │ ৳2,500   │
├────────────────┴──────────┴────────────┼─────────────┼──────────┤
│ Monthly Total                          │ ৳45,000     │ ৳32,500  │
└────────────────────────────────────────┴─────────────┴──────────┘
```

- **⚠ orange border** on a row means the calculated amount was capped by NBR exemption rules
- "Allowed" = tax-exempt portion per NBR rules
- "Taxable" = Calculated − Allowed

---

##### Detailed Mode

Enter each salary component separately for precise control.

| Field | Label (En) | Label (Bn) | Type |
|---|---|---|---|
| Months Worked | Months Worked | কাজের মাস | Number (1–12) |
| Monthly Basic | Monthly Basic | মাসিক মূল বেতন | Number |
| Monthly House Rent | Monthly House Rent Allowance | মাসিক বাড়ি ভাড়া ভাতা | Number |
| Monthly Medical | Monthly Medical Allowance | মাসিক চিকিৎসা ভাতা | Number |
| Monthly Conveyance | Monthly Conveyance Allowance | মাসিক যাতায়াত ভাতা | Number |
| Monthly Other | Monthly Other Allowance | মাসিক অন্যান্য ভাতা | Number |

---

##### Yearly Bonus

Below the salary period cards, a separate field:

| Field | Label (En) | Label (Bn) | Type | Note |
|---|---|---|---|---|
| Yearly Bonus | Yearly Bonus / Arrear / Leave Encashment | বার্ষিক বোনাস | Number | Fully taxable — added directly to salary income |

---

##### Period Controls

```
[ + Add Another Period ]     ← visible when < 3 periods exist
```

**Validation error (shown as a banner):**
- Total months across all periods must not exceed 12
- Error: "Total months worked (14) exceeds 12. Please review salary periods."

---

#### Section C — Other Income Sources (অন্যান্য আয়)

A 2-column grid of number inputs:

| Field | Label (En) | Label (Bn) |
|---|---|---|
| Rental Income | Rental Income | ভাড়া আয় |
| Business Income | Business Income | ব্যবসায়িক আয় |
| Capital Gain | Capital Gain | মূলধনি লাভ |
| Financial Income | Financial Income (Interest, Dividends) | আর্থিক আয় |
| Other Income | Other Income | অন্যান্য আয় |

All fields accept numbers in BDT (৳). Default is 0.

---

#### Section D — Investment & Assets (বিনিয়োগ ও সম্পদ)

A 2-column grid:

| Field | Label (En) | Label (Bn) | Purpose |
|---|---|---|---|
| Investment Amount | Investment Amount | বিনিয়োগের পরিমাণ | Used to calculate 15% tax rebate |
| Net Assets | Net Assets | নিট সম্পদ | Used to determine surcharge eligibility (threshold: ৳4 crore) |

---

### 4. Tax Result (`TaxResultComponent`)

**Files:** `tax-result.component.ts` | `tax-result.component.html` | `tax-result.component.scss`

Displays the full tax calculation result. Receives `TaxResult` as an `@Input()`. Hidden if no result has been calculated yet.

---

#### Section 1 — Summary Banner

A gradient banner with 4 key figures:

```
┌───────────────┬─────────────────┬────────────────┬──────────────────┐
│ Total Income  │ Final Tax       │ Effective Rate │ Monthly          │
│               │ Payable         │                │ Deduction        │
│ ৳12,00,000   │ ৳1,02,500        │ 8.54%          │ ৳8,542           │
└───────────────┴─────────────────┴────────────────┴──────────────────┘
```

| Metric | Formula |
|---|---|
| Total Income | Sum of all income sources |
| Final Tax Payable | `finalTax` from calculation result |
| Effective Rate | `(finalTax / totalIncome) × 100` % |
| Monthly Deduction | `finalTax / 12` |

Responsive: 4 cols → 2 cols (tablet) → 1 col (mobile).

---

#### Section 2 — Income Breakdown Table

```
┌─────────────────────────────────────┬──────────────┐
│ Income / Threshold                  │ Amount (BDT) │
├─────────────────────────────────────┼──────────────┤
│ ▶ Salary Income          [expand]   │  ৳9,00,000   │
│    Monthly Salary                   │  ৳8,40,000   │  ← sub-row (visible when expanded)
│    Yearly Bonus                     │    ৳60,000   │  ← sub-row (visible when expanded)
│ Rental Income                       │  ৳1,20,000   │
│ Business Income                     │  ৳1,80,000   │
│ Capital Gain                        │       —      │
│ Financial Income                    │       —      │
│ Other Income                        │       —      │
├─────────────────────────────────────┼──────────────┤
│ Tax-Free Threshold                  │ (৳3,75,000)  │
├─────────────────────────────────────┼──────────────┤
│ Taxable Income                      │  ৳8,25,000   │
└─────────────────────────────────────┴──────────────┘
```

- Salary Income row is **expandable** — clicking ▶ reveals sub-rows for Monthly Salary and Yearly Bonus
- Zero-income rows show `—`
- Tax-Free Threshold is shown in parentheses (deduction)
- **Taxable Income** row is highlighted

---

#### Section 3 — Tax Slab Breakdown Table

Shows how taxable income is distributed across progressive tax brackets:

```
┌────────────────────────────────────┬──────┬────────────────┬──────────┐
│ Income Range                       │ Rate │ Taxable Amount │ Tax      │
├────────────────────────────────────┼──────┼────────────────┼──────────┤
│ First ৳3,75,000                    │  0%  │    ৳3,75,000   │       ৳0 │
│ Next ৳3,00,000 (up to ৳6,75,000)  │ 10%  │    ৳3,00,000   │  ৳30,000 │
│ Next ৳1,50,000 (up to ৳8,25,000)  │ 15%  │    ৳1,50,000   │  ৳22,500 │
├────────────────────────────────────┴──────┴────────────────┼──────────┤
│ Gross Tax                                                  │  ৳52,500 │
└────────────────────────────────────────────────────────────┴──────────┘
```

- 0% rows have a lighter background
- Range labels appear in both English and Bengali
- Table is horizontally scrollable on small screens
- **Gross Tax** is the total row

---

#### Section 4 — Tax Computation Table

```
┌──────────────────────────────────────────────┬───────────┐
│ Item                                         │ Amount    │
├──────────────────────────────────────────────┼───────────┤
│ Gross Tax                                    │  ৳52,500  │
│ Investment Rebate                            │           │
│   (Eligible Investment: ৳2,00,000 × 15%)    │ −৳30,000  │
│ Tax After Rebate                             │  ৳22,500  │
│ ⚠ Minimum Tax Applied                        │   ৳5,000  │  ← warning style, if triggered
│ Surcharge (10% of Gross Tax)                 │       ৳0  │  ← shown only if net assets > ৳4Cr
├──────────────────────────────────────────────┼───────────┤
│ Final Tax Payable                            │  ৳22,500  │
└──────────────────────────────────────────────┴───────────┘
```

- Investment rebate row includes the eligible investment base and rate used
- Minimum tax row appears with a ⚠ warning style only if the minimum tax floor was triggered
- Surcharge row is present only if net assets exceed ৳4 crore
- **Final Tax Payable** row is highlighted

---

#### Section 5 — Step-by-Step Explanation

```
┌──────────────────────────────────────────────────────────────┐
│  Step-by-Step Explanation      [English] [বাংলা]  [↓ PDF]     │
├──────────────────────────────────────────────────────────────┤
│  1. Total Income Calculation                                 │
│       Salary:  ৳9,00,000                                     │
│       Rental:  ৳1,20,000                                     │
│       Total:   ৳12,00,000                                    │
│  2. Taxable Income                                           │
│       ৳12,00,000 − ৳3,75,000 (threshold) = ৳8,25,000         │
│  3. Tax Slab Calculation                                     │
│       First ৳3,75,000 @ 0% = ৳0                              │
│       Next  ৳3,00,000 @ 10% = ৳30,000                        │
│       Next  ৳1,50,000 @ 15% = ৳22,500                        │
│       Gross Tax = ৳52,500                                    │
│  4. Investment Rebate                                        │
│       Eligible: ৳2,00,000 × 15% = ৳30,000                    │
│  5. Final Tax                                                │
│       ৳52,500 − ৳30,000 = ৳22,500                            │
└──────────────────────────────────────────────────────────────┘
```

**Language Tabs:**
- **English** — full explanation in English
- **বাংলা** — same content in Bengali

**PDF Button:** Triggers PDF download of the complete tax report.

Each step has:
- A main step heading (bold)
- Sub-items (indented, monospace) showing the actual arithmetic

---

## Services

### TaxYearService

**File:** `src/app/services/tax-year.service.ts`

Manages fiscal year state using Angular Signals.

| Signal / Method | Type | Description |
|---|---|---|
| `selectedYear` | `WritableSignal<FiscalYear>` | Currently active fiscal year |
| `availableYears` | `computed Signal<FiscalYear[]>` | Last 5 fiscal years |
| `detectCurrentFiscalYear()` | `() => FiscalYear` | Auto-detects based on current month |
| `setYear(year)` | `(FiscalYear) => void` | Updates the selected year |

**`FiscalYear` interface:**

```typescript
interface FiscalYear {
  fiscalYearStart: number;       // e.g. 2025
  fiscalYearEnd: number;         // e.g. 2026
  assessmentYearStart: number;   // e.g. 2026
  assessmentYearEnd: number;     // e.g. 2027
  labelEn: string;               // "2025–2026"
  labelBn: string;               // "২০২৫–২০২৬"
}
```

---

### TaxConfigService

**File:** `src/app/services/tax-config.service.ts`

Provides a `computed` signal that returns the correct `TaxConfig` for the currently selected fiscal year. Automatically reacts when `TaxYearService.selectedYear` changes — no manual subscription needed.

| Signal | Type | Description |
|---|---|---|
| `config` | `computed Signal<TaxConfig>` | Full tax config for the selected year |

Adding support for a new tax year only requires adding a new config entry here — no changes to the calculation engine.

---

### TaxCalculationService

**File:** `src/app/services/tax-calculation.service.ts`

Pure, stateless calculation engine. Takes `TaxInput` + `TaxConfig` and returns `TaxResult`. Has no dependency on other stateful services.

| Method | Signature | Description |
|---|---|---|
| `calculate` | `(input, config) => TaxResult` | Full tax calculation pipeline |
| `computeGrossBreakdown` | `(grossMonthly, config) => GrossSalaryBreakdown` | Breaks a gross salary into taxable components |
| `grossBreakdownToSalaryPeriod` | `(breakdown, months) => SalaryPeriod` | Converts a gross breakdown into a `SalaryPeriod` |

**Internal calculation pipeline:**

1. Convert all gross salary periods to detailed component form
2. Apply per-component exemptions → compute taxable monthly salary income
3. Add yearly bonus → total salary income
4. Add all other sources → `totalIncome`
5. Subtract tax-free threshold → `taxableIncome` (floor: 0)
6. Apply progressive slabs sequentially → `grossTax` + `slabBreakdown[]`
7. Compute eligible investment → calculate rebate
8. `taxAfterRebate = grossTax − rebate`
9. Apply minimum tax floor if applicable
10. Calculate surcharge if net assets > ৳4 crore
11. `finalTax = max(0, payableTax + surcharge)`
12. Build bilingual `explanationEn[]` and `explanationBn[]` step objects

---

### TaxExportService

**File:** `src/app/services/tax-export.service.ts`

Generates and triggers a browser download of a PDF tax report using **jsPDF** and **jspdf-autotable**.

| Method | Signature | Description |
|---|---|---|
| `exportPDF` | `(result: TaxResult, fiscalYear: string) => void` | Builds and downloads the PDF |

---

## Data Models

**File:** `src/app/models/tax.models.ts`

```typescript
type TaxpayerCategory = 'general' | 'female' | 'disabled' | 'freedom_fighter';

interface TaxInput {
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

interface SalaryPeriod {
  monthsWorked: number;        // 1–12
  monthlyBasic: number;
  monthlyHouseRent: number;
  monthlyMedical: number;
  monthlyConveyance: number;
  monthlyOther: number;
}

interface TaxResult {
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

interface SlabBreakdown {
  slabIndex: number;
  rangeEn: string;
  rangeBn: string;
  rate: number;
  taxableAmount: number;
  tax: number;
}

interface ExplanationStep {
  text: string;
  subItems?: string[];
}
```

---

## Tax Calculation Rules

All rules follow the **Bangladesh Income Tax Act 2023** and NBR guidelines for fiscal year 2025–2026. They are driven entirely by `TaxConfig` — nothing is hardcoded in the calculation engine.

---

### Taxpayer Categories & Thresholds

Annual income below the threshold is fully tax-free:

| Category | English Label | Bengali Label | Tax-Free Threshold |
|---|---|---|---|
| `general` | General | সাধারণ | ৳3,75,000 |
| `female` | Female / Senior (65+) | নারী / প্রবীণ | ৳4,25,000 |
| `disabled` | Disabled | প্রতিবন্ধী | ৳5,00,000 |
| `freedom_fighter` | Freedom Fighter | মুক্তিযোদ্ধা | ৳5,25,000 |

```
Taxable Income = max(0, Total Income − Tax-Free Threshold)
```

---

### Salary Component Exemptions

Applied to each salary period. NBR allows partial exemptions per component:

| Component | Default % of Gross | Exemption Rule | Taxable Portion |
|---|---|---|---|
| Basic | 50% | Fully taxable | 100% of basic |
| House Rent Allowance | 30% | `min(amount, 50% of basic, ৳25,000/mo)` is exempt | Remainder |
| Medical Allowance | 10% | `min(amount, 10% of basic, ৳10,000/mo)` is exempt | Remainder |
| Conveyance Allowance | 5% | ৳2,500/month flat exemption | Amount > ৳2,500 |
| Other Allowances | 5% | No exemption | 100% taxable |

**Example — Gross ৳50,000/month:**

| Component | Calculated | Exempt | Taxable |
|---|---|---|---|
| Basic | ৳25,000 | ৳0 | ৳25,000 |
| House Rent | ৳15,000 | ৳12,500 (50% of basic) | ৳2,500 |
| Medical | ৳5,000 | ৳2,500 (10% of basic) | ৳2,500 |
| Conveyance | ৳2,500 | ৳2,500 (flat) | ৳0 |
| Other | ৳2,500 | ৳0 | ৳2,500 |
| **Monthly Total** | **৳50,000** | **৳17,500** | **৳32,500** |

---

### Progressive Tax Slabs

Applied sequentially to `taxableIncome`. Slabs come from `TaxConfig`:

**2025–2026 Slabs:**

| Slab | Income Range (Annual Cumulative) | Rate |
|---|---|---|
| 1 | First ৳3,75,000 | 0% |
| 2 | Next ৳3,00,000 (up to ৳6,75,000) | 10% |
| 3 | Next ৳4,00,000 (up to ৳10,75,000) | 15% |
| 4 | Next ৳5,00,000 (up to ৳15,75,000) | 20% |
| 5 | Next ৳20,00,000 (up to ৳35,75,000) | 25% |
| 6 | Remainder (above ৳35,75,000) | 30% |

**Example — Taxable Income ৳8,25,000:**

| Slab | Amount in Slab | Rate | Tax |
|---|---|---|---|
| 0% | ৳3,75,000 | 0% | ৳0 |
| 10% | ৳3,00,000 | 10% | ৳30,000 |
| 15% | ৳1,50,000 | 15% | ৳22,500 |
| **Gross Tax** | | | **৳52,500** |

---

### Investment Rebate

Tax relief for qualifying investments (DPS, savings certificates, life insurance, provident fund, etc.).

**Step 1 — Eligible Investment:**
```
Eligible Investment = min(
  Actual Investment Amount entered,
  25% of Total Income,
  ৳1,50,00,000  ← absolute cap
)
```

**Step 2 — Rebate Amount:**
```
Rebate = min(
  Eligible Investment × 15%,
  3% of Total Income,
  ৳10,00,000,   ← absolute cap
  Gross Tax     ← rebate cannot exceed the tax itself
)
```

**Example:**

| Item | Value |
|---|---|
| Total Income | ৳12,00,000 |
| Investment Entered | ৳2,00,000 |
| 25% of Income cap | ৳3,00,000 |
| Eligible Investment | ৳2,00,000 |
| Rebate (15%) | ৳30,000 |
| 3% of Income cap | ৳36,000 |
| **Final Rebate** | **৳30,000** |

---

### Minimum Tax

If a taxpayer has taxable income but their tax after rebate is less than ৳5,000, the minimum tax floor applies:

```
Payable Tax = max(Tax After Rebate, ৳5,000)
```

This is only triggered when `taxableIncome > 0`. If income is below the threshold (no tax due), minimum tax does not apply.

---

### Surcharge

An additional levy on high-wealth taxpayers:

| Net Assets | Surcharge |
|---|---|
| ≤ ৳4,00,00,000 | None |
| > ৳4,00,00,000 | 10% of **Gross Tax** |

```
Surcharge = Gross Tax × 10%   (only if net assets > ৳4 crore)
```

Note: Surcharge is based on **Gross Tax**, not on the final tax after rebate.

---

### Final Tax Formula

Complete pipeline in order:

```
1. Total Income     = Salary Income + Yearly Bonus
                    + Rental + Business + Capital Gain + Financial + Other

2. Taxable Income   = max(0, Total Income − Tax-Free Threshold)

3. Gross Tax        = Σ (Amount in Each Slab × Slab Rate)

4. Eligible Inv.    = min(Investment, 25% × Income, ৳1.5 crore)
   Rebate           = min(Eligible × 15%, 3% × Income, ৳10 lakh, Gross Tax)

5. Tax After Rebate = Gross Tax − Rebate

6. Payable Tax      = max(Tax After Rebate, ৳5,000)   [only if taxableIncome > 0]

7. Surcharge        = Gross Tax × 10%                  [only if net assets > ৳4 crore]

8. Final Tax        = max(0, Payable Tax + Surcharge)
```

---

## Bilingual Support

Every piece of visible text in the app is available in both **English** and **বাংলা**:

| UI Element | Approach |
|---|---|
| Section headings | Primary in English, Bengali subtitle below |
| Field labels | English label with Bengali below it |
| Radio / select options | English + Bengali on the same line |
| Tax explanation | Full separate versions, switchable via tabs |
| Number formatting | en-IN locale (South Asian comma grouping) |
| Currency symbol | ৳ throughout the UI; `BDT` in PDF export |

**Key term glossary:**

| English | বাংলা |
|---|---|
| Fiscal Year | আয় বছর |
| Assessment Year | করবর্ষ |
| Tax Year Settings | করবর্ষ সেটিংস |
| Taxpayer Category | করদাতার ধরন |
| Salary Income | বেতন আয় |
| Monthly Basic | মাসিক মূল বেতন |
| House Rent Allowance | বাড়ি ভাড়া ভাতা |
| Medical Allowance | চিকিৎসা ভাতা |
| Conveyance Allowance | যাতায়াত ভাতা |
| Yearly Bonus | বার্ষিক বোনাস |
| Rental Income | ভাড়া আয় |
| Business Income | ব্যবসায়িক আয় |
| Capital Gain | মূলধনি লাভ |
| Financial Income | আর্থিক আয় |
| Other Income | অন্যান্য আয় |
| Investment Amount | বিনিয়োগের পরিমাণ |
| Net Assets | নিট সম্পদ |
| Tax-Free Threshold | করমুক্ত সীমা |
| Taxable Income | করযোগ্য আয় |
| Gross Tax | মোট কর |
| Investment Rebate | বিনিয়োগ রেয়াত |
| Minimum Tax | সর্বনিম্ন কর |
| Surcharge | সারচার্জ |
| Final Tax Payable | প্রদেয় আয়কর |
| Monthly Deduction | মাসিক কর্তন |

---

## PDF Export

The **Download PDF** button in the result panel calls `TaxExportService.exportPDF()`.

**Output filename:** `tax-calculation-YYYY-MM-DD.pdf`

**PDF Contents:**

| Section | Content |
|---|---|
| Title | "Bangladesh Income Tax Calculation" |
| Sub-title | Fiscal year (e.g., "Fiscal Year: 2025–2026") |
| Summary Table | Total Income, Tax-Free Threshold, Taxable Income, Gross Tax, Rebate, Tax After Rebate, Surcharge, Final Tax, Monthly Deduction |
| Slab Breakdown Table | Income Range, Rate, Taxable Amount, Tax (one row per slab) |
| Explanation | Numbered steps with indented sub-items |

**Styling:** Green header rows (RGB 26, 107, 60), alternating body row shading.

**Bengali character handling:** `৳` is replaced with `BDT` and other non-ASCII characters are stripped for PDF font compatibility. The content and numbers remain identical.

---

> This calculator is for estimation purposes only. For official tax filing, consult the National Board of Revenue (NBR) Bangladesh or a certified tax professional.
