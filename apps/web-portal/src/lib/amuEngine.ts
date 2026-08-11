export interface AMUAnalytics {
  totalDoseUnits: number;
  totalTreatments: number;
  byDrug: Record<string, { treatments: number; doseUnits: number }>;
  byMonth: Record<string, { treatments: number; doseUnits: number }>;
  byAnimal: Record<string, { treatments: number; doseUnits: number }>;
  byFarm: Record<string, { treatments: number; doseUnits: number }>;
}

export function parseDosageToNumber(dosageStr: string | null | undefined): number {
  if (!dosageStr) return 0;
  // match the first number found in the dosage string, allowing for decimals
  const match = dosageStr.match(/(\d+(\.\d+)?)/);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  return 0;
}

export function calculateAMU(treatments: any[]): AMUAnalytics {
  const result: AMUAnalytics = {
    totalDoseUnits: 0,
    totalTreatments: 0,
    byDrug: {},
    byMonth: {},
    byAnimal: {},
    byFarm: {},
  };

  if (!treatments) return result;

  for (const t of treatments) {
    const doseUnits = parseDosageToNumber(t.dosage);
    
    result.totalTreatments += 1;
    result.totalDoseUnits += doseUnits;

    const drugName = t.drugName || 'Unknown';
    if (!result.byDrug[drugName]) result.byDrug[drugName] = { treatments: 0, doseUnits: 0 };
    result.byDrug[drugName].treatments += 1;
    result.byDrug[drugName].doseUnits += doseUnits;

    // YYYY-MM
    let monthStr = 'Unknown';
    if (t.administrationDate) {
      const d = new Date(t.administrationDate);
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        monthStr = `${d.getFullYear()}-${mm}`;
      }
    }
    
    if (!result.byMonth[monthStr]) result.byMonth[monthStr] = { treatments: 0, doseUnits: 0 };
    result.byMonth[monthStr].treatments += 1;
    result.byMonth[monthStr].doseUnits += doseUnits;

    const animalId = t.animal?.tagNumber || t.animalId || 'Unknown';
    if (!result.byAnimal[animalId]) result.byAnimal[animalId] = { treatments: 0, doseUnits: 0 };
    result.byAnimal[animalId].treatments += 1;
    result.byAnimal[animalId].doseUnits += doseUnits;

    const farmId = t.animal?.farm?.name || t.animal?.farmId || 'Unknown Farm';
    if (farmId !== 'Unknown Farm') {
      if (!result.byFarm[farmId]) result.byFarm[farmId] = { treatments: 0, doseUnits: 0 };
      result.byFarm[farmId].treatments += 1;
      result.byFarm[farmId].doseUnits += doseUnits;
    }
  }

  return result;
}
