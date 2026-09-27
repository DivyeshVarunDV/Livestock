/** Which species each product can be collected from, and whether only females produce it. */
export const PRODUCT_SOURCES: Record<string, { species: string[]; femaleOnly: boolean; label: string }> = {
  MILK: { species: ['CATTLE', 'BUFFALO', 'GOAT', 'SHEEP'], femaleOnly: true, label: 'Milk' },
  MEAT: { species: ['CATTLE', 'BUFFALO', 'GOAT', 'SHEEP', 'PIG', 'POULTRY'], femaleOnly: false, label: 'Meat' },
  EGGS: { species: ['POULTRY'], femaleOnly: true, label: 'Eggs' },
};

/** Returns why the product cannot come from this animal, or null when it can. */
export function productIneligibility(productType: string, species?: string | null, gender?: string | null): string | null {
  const source = PRODUCT_SOURCES[productType];
  if (!source) return null; // other products are not species-restricted
  const sp = String(species ?? '').toUpperCase();
  if (sp && !source.species.includes(sp)) {
    return `${source.label} cannot be collected from ${sp.toLowerCase()}`;
  }
  if (source.femaleOnly && String(gender ?? '').toUpperCase() === 'MALE') {
    return `${source.label} cannot be collected from a male animal`;
  }
  return null;
}
