export interface MRLDecisionInput {
  animalId: string;
  drug: string;
  measuredResidue: number | null;
  mrlLimit: number;
  testDate: string | null;
  withdrawalStatus: 'ACTIVE' | 'DUE SOON' | 'CLEARED';
  withdrawalDaysRemaining: number;
}

export interface MRLDecision {
  status: 'COMPLIANT' | 'NON-COMPLIANT' | 'DO_NOT_SELL' | 'PENDING';
  reason: string;
}

export function calculateMRLCompliance(input: MRLDecisionInput): MRLDecision {
  if (input.measuredResidue === null || input.measuredResidue === undefined) {
    return {
      status: 'PENDING',
      reason: 'Laboratory testing is still pending.'
    };
  }

  if (input.measuredResidue > input.mrlLimit) {
    return {
      status: 'NON-COMPLIANT',
      reason: `Residue ${input.measuredResidue} mg/kg exceeds MRL ${input.mrlLimit} mg/kg.`
    };
  }

  if (input.withdrawalStatus !== 'CLEARED') {
    return {
      status: 'DO_NOT_SELL',
      reason: `Withdrawal period active — ${input.withdrawalDaysRemaining} days remaining.`
    };
  }

  return {
    status: 'COMPLIANT',
    reason: 'Residue is within permitted limit and withdrawal is complete.'
  };
}
