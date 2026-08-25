import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TreatmentService } from '../treatment/treatment.service';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private treatmentService: TreatmentService,
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

    // Group by vaccine name
    const vaccineCounts = await this.prisma.vaccination.groupBy({
      by: ['vaccineName'],
      _count: true,
    });

    return {
      totalVaccinations,
      upcomingCount,
      vaccineCounts: vaccineCounts.map((item: any) => ({
        name: item.vaccineName,
        count: item._count,
      })),
    };
  }

  async getTreatmentReport() {
    const totalTreatments = await this.prisma.treatment.count();
    const drugCounts = await this.prisma.treatment.groupBy({
      by: ['drugName'],
      _count: true,
    });

    // Monthly treatment counts for chart
    const treatments = await this.prisma.treatment.findMany({
      select: { administrationDate: true },
    });

    const monthlyCounts: Record<string, number> = {};
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

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
      drugCounts: drugCounts.map((item: any) => ({
        name: item.drugName,
        count: item._count,
      })),
      monthlyData,
    };
  }

  async getMrlComplianceReport() {
    await this.treatmentService.updateAnimalMrlStatuses();
    const mrlCounts = await this.prisma.animal.groupBy({
      by: ['mrlStatus'],
      _count: true,
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
    };
  }

  async getDashboardStats() {
    await this.treatmentService.updateAnimalMrlStatuses();
    const totalFarms = await this.prisma.farm.count();
    const totalAnimals = await this.prisma.animal.count();
    const underTreatment = await this.prisma.animal.count({
      where: { status: 'UNDER_TREATMENT' },
    });
    const vaccinationsDue = await this.prisma.vaccination.count({
      where: { nextDueDate: { lte: new Date() } },
    });
    const activeMrlAlerts = await this.prisma.animal.count({
      where: { mrlStatus: { in: ['DO_NOT_SELL', 'CLEARING_SOON'] } },
    });
    const veterinaryPrescriptions = await this.prisma.prescription.count();

    // Recent activities (we can merge recent treatments, vaccinations, health records, etc.)
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

    // Monthly treatment trend
    const treatmentReport = await this.getTreatmentReport();

    // Group animals by species
    const speciesCounts = await this.prisma.animal.groupBy({
      by: ['species'],
      _count: true,
    });

    return {
      stats: {
        totalFarms,
        totalAnimals,
        underTreatment,
        vaccinationsDue,
        activeMrlAlerts,
        veterinaryPrescriptions,
      },
      recentActivities: activities.slice(0, 5),
      monthlyTreatments: treatmentReport.monthlyData,
      speciesDistribution: speciesCounts.map((s: any) => ({
        name: s.species,
        value: s._count,
      })),
    };
  }
}
