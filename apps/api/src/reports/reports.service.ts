import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDailyMap(since: Date): Map<string, number> {
  const map = new Map<string, number>();
  const cursor = new Date(since);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  while (cursor <= today) {
    map.set(isoDate(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  return map;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() { return this.prisma as any; }

  async getPublicStats() {
    const [totalVideos, approvedVideos, totalUsers, analysisDone] = await Promise.all([
      this.db.crossingVideo.count(),
      this.db.crossingVideo.count({ where: { approvalStatus: 'APPROVED' } }),
      this.db.user.count({ where: { approvalStatus: 'APPROVED' } }),
      this.db.crossingVideo.count({ where: { analysisStatus: 'DONE' } }),
    ]);
    return { totalVideos, approvedVideos, totalUsers, analysisDone };
  }

  async getSummary() {
    const since30 = daysAgo(30);
    const since7  = daysAgo(7);

    const [
      userTotal,
      usersByRole,
      usersPending,
      usersWithMfa,
      usersLast30Raw,
      videoTotal,
      videosBySource,
      videosByApproval,
      videosByAnalysis,
      videosSizeAgg,
      videosLast30Raw,
      logTotal,
      logsLast30Raw,
      logsByAction,
      failedLogins7d,
    ] = await Promise.all([
      this.db.user.count(),
      this.db.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.db.user.count({ where: { approvalStatus: 'PENDING' } }),
      this.db.user.count({ where: { mfaEnabled: true } }),
      this.db.user.findMany({
        where: { createdAt: { gte: since30 } },
        select: { createdAt: true },
      }),

      this.db.crossingVideo.count(),
      this.db.crossingVideo.groupBy({ by: ['sourceType'], _count: { _all: true } }),
      this.db.crossingVideo.groupBy({ by: ['approvalStatus'], _count: { _all: true } }),
      this.db.crossingVideo.groupBy({ by: ['analysisStatus'], _count: { _all: true } }),
      this.db.crossingVideo.aggregate({ _sum: { size: true } }),
      this.db.crossingVideo.findMany({
        where: { createdAt: { gte: since30 } },
        select: { createdAt: true },
      }),

      this.db.activityLog.count(),
      this.db.activityLog.findMany({
        where: { createdAt: { gte: since30 } },
        select: { createdAt: true },
      }),
      this.db.activityLog.groupBy({
        by: ['action'],
        _count: { _all: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.db.activityLog.count({
        where: { action: 'LOGIN_FAILED', createdAt: { gte: since7 } },
      }),
    ]);

    const userDailyMap = buildDailyMap(since30);
    for (const u of usersLast30Raw) {
      const key = isoDate(new Date(u.createdAt));
      userDailyMap.set(key, (userDailyMap.get(key) ?? 0) + 1);
    }

    const videoDailyMap = buildDailyMap(since30);
    for (const v of videosLast30Raw) {
      const key = isoDate(new Date(v.createdAt));
      videoDailyMap.set(key, (videoDailyMap.get(key) ?? 0) + 1);
    }

    const logDailyMap = buildDailyMap(since30);
    for (const l of logsLast30Raw) {
      const key = isoDate(new Date(l.createdAt));
      logDailyMap.set(key, (logDailyMap.get(key) ?? 0) + 1);
    }

    const toSeries = (map: Map<string, number>) =>
      Array.from(map.entries()).map(([date, count]) => ({ date, count }));

    const toRecord = (grouped: { role?: string; sourceType?: string; approvalStatus?: string; analysisStatus?: string; _count: { _all: number } }[], key: string) => {
      const rec: Record<string, number> = {};
      for (const g of grouped) rec[(g as any)[key]] = g._count._all;
      return rec;
    };

    return {
      users: {
        total: userTotal,
        byRole: toRecord(usersByRole, 'role'),
        pendingApproval: usersPending,
        withMfa: usersWithMfa,
        registrationsLast30Days: toSeries(userDailyMap),
      },
      videos: {
        total: videoTotal,
        bySourceType: toRecord(videosBySource, 'sourceType'),
        byApprovalStatus: toRecord(videosByApproval, 'approvalStatus'),
        byAnalysisStatus: toRecord(videosByAnalysis, 'analysisStatus'),
        totalSizeBytes: videosSizeAgg._sum.size ?? 0,
        uploadsLast30Days: toSeries(videoDailyMap),
      },
      activity: {
        totalLogs: logTotal,
        last30Days: toSeries(logDailyMap),
        byAction: (logsByAction as any[]).map((g) => ({ action: g.action, count: g._count._all })),
        failedLogins7Days: failedLogins7d,
      },
    };
  }
}
