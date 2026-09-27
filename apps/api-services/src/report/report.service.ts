import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ComplianceService } from '../compliance/compliance.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_VIOLATION_STATUSES = ['PENDING_INVESTIGATION', 'UNDER_REVIEW', 'CONFIRMED'];
const SEVERITY_WEIGHT: Record<string, number> = { LOW: 5, MEDIUM: 10, HIGH: 20, CRITICAL: 35 };

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private compliance: ComplianceService,
  ) {}

  async getHealthReport() {
    const totalAnimals = await this.prisma.animal.count();
    const statusCounts = await this.prisma.animal.groupBy({
      by: ['status'],
      _count: true,
    });
    const healthRecordsCount = await this.prisma.healthRecord.count();

    return {
      totalAnimals,
      healthRecordsCount,
      statusCounts: statusCounts.reduce((acc: any, curr: any) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {}),
    };
  }

  async getVaccinationReport() {
    const totalVaccinations = await this.prisma.vaccination.count();
    const upcomingCount = await this.prisma.vaccination.count({
      where: { nextDueDate: { gte: new Date() } },
    });

    const overdueCount = await this.prisma.vaccination.count({
      where: { nextDueDate: { lt: new Date() } },
    });

    const vaccineCounts = await this.prisma.vaccination.groupBy({
      by: ['vaccineName'],
      _count: true,
    });

    return {
      totalVaccinations,
      upcomingCount,
      overdueCount,
      vaccineCounts: vaccineCounts.map((item: any) => ({
        name: item.vaccineName,
        count: item._count,
      })),
    };
  }

  async getTreatmentReport() {
    const totalTreatments = await this.prisma.treatment.count();
    const totalAmuRecords = await this.prisma.amuRecord.count();
    const drugCounts = await this.prisma.treatment.groupBy({
      by: ['drugName'],
      _count: true,
    });

    const treatments = await this.prisma.treatment.findMany({
      select: { administrationDate: true },
    });

    const monthlyCounts: Record<string, number> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    treatments.forEach((t: any) => {
      const date = new Date(t.administrationDate);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
    });

    const monthlyData = Object.keys(monthlyCounts).map((month) => ({
      month,
      count: monthlyCounts[month],
    }));

    return {
      totalTreatments,
      totalAmuRecords,
      drugCounts: drugCounts.map((item: any) => ({
        name: item.drugName,
        count: item._count,
      })),
      monthlyData,
    };
  }

  async getMrlComplianceReport() {
    await this.compliance.sweep();
    const mrlCounts = await this.prisma.animal.groupBy({
      by: ['mrlStatus'],
      _count: true,
    });

    const activeWithdrawals = await this.prisma.withdrawalRecord.count({
      where: { status: 'RESTRICTED' },
    });

    const counts = mrlCounts.reduce((acc: any, curr: any) => {
      acc[curr.mrlStatus] = curr._count;
      return acc;
    }, {});

    const total = await this.prisma.animal.count();

    return {
      total,
      cleared: counts['CLEARED'] || 0,
      clearingSoon: counts['CLEARING_SOON'] || 0,
      doNotSell: counts['DO_NOT_SELL'] || 0,
      activeWithdrawals,
    };
  }

  async getDashboardStats() {
    await this.compliance.sweep();
    const totalFarms = await this.prisma.farm.count();
    const totalAnimals = await this.prisma.animal.count();
    const activeAnimals = await this.prisma.animal.count({
      where: {
        OR: [
          { currentStatus: 'ACTIVE' },
          { currentStatus: null },
        ],
      },
    });
    const underTreatment = await this.prisma.animal.count({
      where: { status: 'UNDER_TREATMENT' },
    });
    const animalsUnderWithdrawal = await this.prisma.withdrawalRecord.count({
      where: { status: 'RESTRICTED' },
    });
    const vaccinationsDue = await this.prisma.vaccination.count({
      where: { nextDueDate: { lte: new Date() } },
    });
    const vaccinationsCompleted = await this.prisma.vaccination.count();
    const activeMrlAlerts = await this.prisma.animal.count({
      where: { mrlStatus: { in: ['DO_NOT_SELL', 'CLEARING_SOON'] } },
    });
    const veterinaryPrescriptions = await this.prisma.prescription.count();
    const pendingOwnershipTransfers = await this.prisma.ownershipTransfer.count({
      where: { status: 'PENDING' },
    });
    const productTests = await this.prisma.milkTest.count();
    const failedTests = await this.prisma.milkTest.count({
      where: { result: 'FAIL' },
    });
    const activeInvestigations = await this.prisma.violation.count({
      where: { status: { in: ['PENDING_INVESTIGATION', 'UNDER_REVIEW'] } },
    });

    const recentTreatments = await this.prisma.treatment.findMany({
      include: { animal: { select: { name: true, tagNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const recentVaccinations = await this.prisma.vaccination.findMany({
      include: { animal: { select: { name: true, tagNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const recentHealth = await this.prisma.healthRecord.findMany({
      include: { animal: { select: { name: true, tagNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const activities: any[] = [];

    recentTreatments.forEach((t: any) => {
      activities.push({
        id: `treatment-${t.id}`,
        type: 'TREATMENT',
        description: `Administered ${t.drugName} (${t.dosage}) to ${t.animal.name} (${t.animal.tagNumber})`,
        date: t.administrationDate,
        user: t.veterinarianName,
      });
    });

    recentVaccinations.forEach((v: any) => {
      activities.push({
        id: `vaccination-${v.id}`,
        type: 'VACCINATION',
        description: `Vaccinated ${v.animal.name} (${v.animal.tagNumber}) with ${v.vaccineName}`,
        date: v.vaccinationDate,
        user: v.veterinarianName,
      });
    });

    recentHealth.forEach((h: any) => {
      activities.push({
        id: `health-${h.id}`,
        type: 'HEALTH',
        description: `Diagnosed ${h.animal.name} (${h.animal.tagNumber}) with ${h.diagnosis}`,
        date: h.date,
        user: h.veterinarianName,
      });
    });

    activities.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const treatmentReport = await this.getTreatmentReport();

    const speciesCounts = await this.prisma.animal.groupBy({
      by: ['species'],
      _count: true,
    });

    return {
      stats: {
        totalFarms,
        totalAnimals,
        activeAnimals,
        underTreatment,
        animalsUnderWithdrawal,
        vaccinationsCompleted,
        vaccinationsDue,
        activeMrlAlerts,
        veterinaryPrescriptions,
        pendingOwnershipTransfers,
        productTests,
        failedTests,
        activeInvestigations,
      },
      recentActivities: activities.slice(0, 5),
      monthlyTreatments: treatmentReport.monthlyData,
      speciesDistribution: speciesCounts.map((s: any) => ({
        name: s.species,
        value: s._count,
      })),
    };
  }

  /** Antimicrobial-use surveillance: usage by active ingredient, species and month. */
  async getAmuReport(days = 365) {
    const since = new Date(Date.now() - Math.max(1, Math.min(days, 3650)) * DAY_MS);
    const records = await this.prisma.amuRecord.findMany({
      where: { startDate: { gte: since } },
      include: { animal: { select: { species: true, farmId: true } } },
    });
    const byIngredient: Record<string, number> = {};
    const bySpecies: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const farms = new Set<string>();
    for (const r of records) {
      const ingredient = (r.activeIngredient || r.medicine || 'UNKNOWN').trim();
      byIngredient[ingredient] = (byIngredient[ingredient] || 0) + 1;
      const species = r.animal?.species || 'UNKNOWN';
      bySpecies[species] = (bySpecies[species] || 0) + 1;
      const month = new Date(r.startDate).toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
      if (r.animal?.farmId) farms.add(r.animal.farmId);
    }
    const toList = (m: Record<string, number>) =>
      Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return {
      since: since.toISOString(),
      totalCourses: records.length,
      farmsUsingAntimicrobials: farms.size,
      byActiveIngredient: toList(byIngredient),
      bySpecies: toList(bySpecies),
      monthly: Object.entries(byMonth).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  /**
   * Risk-based inspection planning. Each farm receives a transparent 0-100
   * score from its open cases (weighted by severity), failed residue tests,
   * antimicrobial courses in the last 90 days and animals under withdrawal.
   */
  async getFarmRiskReport() {
    await this.compliance.sweep();
    const since90 = new Date(Date.now() - 90 * DAY_MS);
    const farms = await this.prisma.farm.findMany({
      select: {
        id: true, farmerId: true, name: true, district: true, village: true, farmStatus: true,
        violations: { select: { severity: true, status: true } },
        milkTests: { select: { result: true } },
        animals: {
          select: {
            mrlStatus: true,
            amuRecords: { where: { startDate: { gte: since90 } }, select: { id: true } },
          },
        },
      },
    });
    const rows = farms.map((f) => {
      const openCases = f.violations.filter((v) => OPEN_VIOLATION_STATUSES.includes(v.status));
      const confirmedHistory = f.violations.filter((v) => v.status === 'RESOLVED' || v.status === 'CONFIRMED').length;
      const failedTests = f.milkTests.filter((t) => t.result === 'FAIL').length;
      const amuCourses90d = f.animals.reduce((n, a) => n + a.amuRecords.length, 0);
      const underWithdrawal = f.animals.filter((a) => a.mrlStatus !== 'CLEARED').length;
      const factors = {
        openCases: openCases.reduce((n, v) => n + (SEVERITY_WEIGHT[v.severity] ?? 10), 0),
        confirmedHistory: confirmedHistory * 5,
        failedTests: failedTests * 15,
        antimicrobialUse: Math.min(amuCourses90d * 2, 20),
        underWithdrawal: Math.min(underWithdrawal * 2, 10),
      };
      const score = Math.min(100, Object.values(factors).reduce((a, b) => a + b, 0));
      const band = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
      return {
        farmId: f.id, farmerId: f.farmerId, name: f.name, district: f.district, village: f.village, farmStatus: f.farmStatus,
        score, band, factors,
        metrics: { openCases: openCases.length, failedTests, amuCourses90d, animals: f.animals.length, underWithdrawal },
      };
    });
    rows.sort((a, b) => b.score - a.score);
    return {
      generatedAt: new Date().toISOString(),
      methodology: 'Score = severity-weighted open cases + 5/confirmed case + 15/failed residue test + 2/AMU course in 90 days (max 20) + 2/animal under withdrawal (max 10); capped at 100. HIGH >= 60, MEDIUM >= 30.',
      summary: {
        HIGH: rows.filter((r) => r.band === 'HIGH').length,
        MEDIUM: rows.filter((r) => r.band === 'MEDIUM').length,
        LOW: rows.filter((r) => r.band === 'LOW').length,
      },
      farms: rows,
    };
  }
}
