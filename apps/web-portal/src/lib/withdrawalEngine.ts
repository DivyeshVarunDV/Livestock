export interface TreatmentRecord {
  id?: string;
  animalId: string;
  treatmentDate: string;
  medicine: string;
  withdrawalPeriodDays?: number;
  [key: string]: any;
}

export interface WithdrawalStatus {
  endDate: Date | null;
  daysRemaining: number;
  status: 'ACTIVE' | 'DUE SOON' | 'CLEARED';
  treatment?: TreatmentRecord;
}

export function calculateWithdrawal(treatmentDate: string | Date, withdrawalDays: number | undefined): WithdrawalStatus {
  if (!treatmentDate || typeof withdrawalDays !== 'number' || withdrawalDays < 0) {
    return { endDate: null, daysRemaining: 0, status: 'CLEARED' };
  }

  const start = new Date(treatmentDate);
  if (isNaN(start.getTime())) {
    return { endDate: null, daysRemaining: 0, status: 'CLEARED' };
  }

  // Calculate end date
  const end = new Date(start.getTime() + withdrawalDays * 24 * 60 * 60 * 1000);
  
  // Calculate days remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to start of day for consistent day diffing if needed, but let's use exact time diff or day diff as before.
  
  // The original used Math.ceil(diffTime / ...), which is fine.
  const diffTime = end.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const daysRemaining = diffDays;

  // Classify
  let status: 'ACTIVE' | 'DUE SOON' | 'CLEARED' = 'CLEARED';
  
  if (daysRemaining > 7) {
    status = 'ACTIVE';
  } else if (daysRemaining >= 1 && daysRemaining <= 7) {
    status = 'DUE SOON';
  } else {
    status = 'CLEARED';
  }

  return {
    endDate: end,
    daysRemaining,
    status
  };
}

export function calculateOverallWithdrawal(treatments: TreatmentRecord[]): WithdrawalStatus {
  if (!treatments || treatments.length === 0) {
    return { endDate: null, daysRemaining: 0, status: 'CLEARED' };
  }

  let latestStatus: WithdrawalStatus = { endDate: null, daysRemaining: 0, status: 'CLEARED' };

  for (const treatment of treatments) {
    const current = calculateWithdrawal(treatment.treatmentDate, treatment.withdrawalPeriodDays);
    
    if (current.endDate) {
      if (!latestStatus.endDate || current.endDate > latestStatus.endDate) {
        latestStatus = { ...current, treatment };
      }
    }
  }

  return latestStatus;
}
