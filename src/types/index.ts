
export enum TenantCategory {
  RETAIL = 'Retail',
  OFFICE = 'Office',
  WELLNESS = 'Wellness',
  DINING = 'Dining',
  ANCHOR = 'Anchor'
}

export interface Tenant {
  id: string;
  name: string;
  category: TenantCategory;
  sf: number;
  rentPsf: number;
  operatingHours: number;
  nightActive: boolean;
}

export interface ProjectState {
  // Land
  landCost: number;
  landClosingPct: number;
  // Build
  totalBuildSf: number;
  phase1Sf: number;
  hardCostPsf: number;
  softCostPct: number;
  contingencyPct: number;
  // Capital
  maxLtc: number;
  interestRate: number;
  amortYears: number;
  ioMonths: number;
  // Walkability
  siteAcres: number;
  pedSpineLengthFt: number;
  avgBlockLengthFt: number;
  numNodes: number;
  shadePct: number;
  seatingIntervalFt: number;
  treeIntervalFt: number;
  heatMitigationCount: number;
  activeFrontagePct: number;
  parkingVisiblePct: number;
  carCrossingsCount: number;
  // Tenants
  tenants: Tenant[];
}

export interface FinancialResults {
  totalProjectCost: number;
  maxLoan: number;
  requiredEquity: number;
  equityPct: number;
  grossPotentialRent: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  noi: number;
  annualDebtService: number;
  dscr: number;
  breakEvenRentPsf: number;
  phase1Noi: number;
  phase1Dscr: number;
}

export interface WalkabilityResults {
  avgWalkDistance: number;
  fiveMinWalkCompliant: boolean;
  comfortScore: number;
  activationScore: number;
  parkingPenalty: number;
  finalScore: number;
  grade: string;
}
