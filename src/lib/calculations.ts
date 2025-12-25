
import { ProjectState, FinancialResults, WalkabilityResults } from './types';

export const calculateFinancials = (state: ProjectState): FinancialResults => {
  const landTotalCost = state.landCost * (1 + state.landClosingPct / 100);
  const hardCostTotal = state.totalBuildSf * state.hardCostPsf;
  const softCostTotal = hardCostTotal * (state.softCostPct / 100);
  const contingencyTotal = hardCostTotal * (state.contingencyPct / 100);
  const totalProjectCost = landTotalCost + hardCostTotal + softCostTotal + contingencyTotal;

  const maxLoan = totalProjectCost * (state.maxLtc / 100);
  const requiredEquity = totalProjectCost - maxLoan;
  const equityPct = (requiredEquity / totalProjectCost) * 100;

  // Rents from tenants
  const gpr = state.tenants.reduce((acc, t) => acc + (t.sf * t.rentPsf), 0);
  const vacancyPct = 0.10; // 10% conservative bank standard
  const egi = gpr * (1 - vacancyPct);
  const expensePct = 0.32; // 32% conservative bank standard
  const opex = egi * expensePct;
  const noi = egi - opex;

  // Debt Service (PMT formula)
  const r = (state.interestRate / 100) / 12;
  const n = state.amortYears * 12;
  const annualDebtService = (maxLoan * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1) * 12;

  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const breakEvenRentPsf = state.totalBuildSf > 0 ? (annualDebtService + opex) / state.totalBuildSf : 0;

  // Phase 1 specific
  const phase1Weight = state.totalBuildSf > 0 ? state.phase1Sf / state.totalBuildSf : 0;
  const phase1Noi = noi * phase1Weight;
  const phase1Loan = maxLoan * phase1Weight;
  const phase1DebtService = annualDebtService * phase1Weight;
  const phase1Dscr = phase1DebtService > 0 ? phase1Noi / phase1DebtService : 0;

  return {
    totalProjectCost,
    maxLoan,
    requiredEquity,
    equityPct,
    grossPotentialRent: gpr,
    effectiveGrossIncome: egi,
    operatingExpenses: opex,
    noi,
    annualDebtService,
    dscr,
    breakEvenRentPsf,
    phase1Noi,
    phase1Dscr
  };
};

export const calculateWalkability = (state: ProjectState): WalkabilityResults => {
  const avgWalkDistance = state.numNodes > 0 ? state.pedSpineLengthFt / state.numNodes : 0;
  const fiveMinWalkCompliant = avgWalkDistance <= 1200;

  // Comfort Score (50%)
  const shadeScore = Math.min(state.shadePct / 70, 1) * 100;
  const seatingScore = state.seatingIntervalFt <= 150 ? 100 : state.seatingIntervalFt <= 250 ? 70 : 40;
  const treeScore = state.treeIntervalFt <= 40 ? 100 : state.treeIntervalFt <= 60 ? 70 : 40;
  const heatScore = Math.min(state.heatMitigationCount / 3, 1) * 100;
  const comfortScore = (shadeScore * 0.35) + (seatingScore * 0.25) + (treeScore * 0.25) + (heatScore * 0.15);

  // Activation Score (50%)
  const frontageScore = state.activeFrontagePct;
  const avgHours = state.tenants.length > 0 ? state.tenants.reduce((a, t) => a + t.operatingHours, 0) / state.tenants.length : 0;
  const hoursScore = avgHours >= 12 ? 100 : avgHours >= 9 ? 70 : 40;
  const usesPerNode = state.numNodes > 0 ? state.tenants.length / state.numNodes : 0;
  const nodeScore = usesPerNode >= 4 ? 100 : usesPerNode >= 3 ? 70 : 40;
  const nightLifePct = state.tenants.length > 0 ? (state.tenants.filter(t => t.nightActive).length / state.tenants.length) * 100 : 0;
  const activationScore = (frontageScore * 0.30) + (hoursScore * 0.25) + (nodeScore * 0.25) + (nightLifePct * 0.20);

  // Penalties
  const parkingPenalty = (state.parkingVisiblePct / 100) * 15;
  const conflictPenalty = state.carCrossingsCount * 3;

  const rawScore = (comfortScore * 0.50) + (activationScore * 0.50);
  const finalScore = Math.max(0, rawScore - parkingPenalty - conflictPenalty);

  let grade = 'Car Dependent';
  if (finalScore >= 85) grade = 'Destination Grade';
  else if (finalScore >= 75) grade = 'Strong Suburban';
  else if (finalScore >= 65) grade = 'Walkable But Fragile';

  return {
    avgWalkDistance,
    fiveMinWalkCompliant,
    comfortScore,
    activationScore,
    parkingPenalty: parkingPenalty + conflictPenalty,
    finalScore,
    grade
  };
};
