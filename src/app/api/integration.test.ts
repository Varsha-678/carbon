import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as registerHandler } from './auth/register/route';
import { POST as loginHandler } from './auth/login/route';
import { GET as getLogsHandler, POST as postLogsHandler } from './logs/route';
import { GET as getInsightsHandler } from './insights/route';
import { GET as getCommunityHandler } from './community/route';
import { prisma } from '@/lib/db';

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    baseline: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    actionLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    badge: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    goal: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth APIs', () => {
    it('register handler should return 400 on validation error', async () => {
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email', password: '123' }),
      });

      const response = await registerHandler(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation error');
    });

    it('login handler should return 401 on incorrect credentials', async () => {
      // Mock findUnique to return null (no user found)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'nonexistent@example.com', password: 'password123' }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Invalid email or password');
    });
  });

  describe('Logs APIs', () => {
    it('get logs handler should return paginated list', async () => {
      const mockLogs = [
        { id: '1', actionType: 'plant_based_meal', category: 'diet', value: 2, co2Saved: 3.0, loggedAt: new Date() },
      ];
      vi.mocked(prisma.actionLog.findMany).mockResolvedValue(mockLogs as never);
      vi.mocked(prisma.actionLog.count).mockResolvedValue(1);
      vi.mocked(prisma.actionLog.aggregate).mockResolvedValue({ _sum: { co2Saved: 3.0 } } as never);

      const request = new Request('http://localhost/api/logs?page=1&limit=5', {
        headers: { 'x-user-id': 'user-123' },
      });

      const response = await getLogsHandler(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.logs).toHaveLength(1);
      expect(data.pagination.totalCount).toBe(1);
      expect(data.totalSavings).toBe(3.0);
    });

    it('post logs handler should log action and calculate correct carbon savings', async () => {
      const mockLog = { id: 'log-123', actionType: 'plant_based_meal', category: 'diet', value: 3, co2Saved: 4.5, loggedAt: new Date() };
      vi.mocked(prisma.actionLog.create).mockResolvedValue(mockLog as never);
      
      const mockUser = { id: 'user-123', streakCount: 2, lastActiveDate: new Date(Date.now() - 24 * 60 * 60 * 1000) }; // active yesterday
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, streakCount: 3 } as never);

      // Group by mock
      vi.mocked(prisma.actionLog.groupBy).mockResolvedValue([] as never);
      vi.mocked(prisma.actionLog.aggregate).mockResolvedValue({ _sum: { co2Saved: 4.5 } } as never);

      const request = new Request('http://localhost/api/logs', {
        method: 'POST',
        headers: { 'x-user-id': 'user-123' },
        body: JSON.stringify({ actionType: 'plant_based_meal', value: 3 }), // 3 meals * 1.5 = 4.5 kg savings
      });

      const response = await postLogsHandler(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.log.actionType).toBe('plant_based_meal');
      expect(data.co2Saved).toBe(4.5);
      expect(data.streakCount).toBe(3); // Streak incremented from 2 to 3
    });
  });

  describe('Insights API', () => {
    it('get insights handler should analyze highest footprint category and return ranked tips', async () => {
      // Mock user baseline
      // Transport emissions: 600km * 0.20 = 120
      // Diet: vegan = 150
      // Energy: 100 kWh * 0.45 = 45
      // Shopping: high = 300 (Highest!)
      const mockBaseline = {
        userId: 'user-123',
        transportDistance: 600,
        transportType: 'car',
        dietType: 'vegan',
        homeEnergyKwh: 100,
        shoppingLevel: 'high',
        calculatedBaseline: 615,
      };

      vi.mocked(prisma.baseline.findUnique).mockResolvedValue(mockBaseline as never);

      const request = new Request('http://localhost/api/insights', {
        headers: { 'x-user-id': 'user-123' },
      });

      const response = await getInsightsHandler(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.highestCategory).toBe('shopping');
      expect(data.highestCategoryLabel).toBe('Shopping & Consumption');
      expect(data.tips).toHaveLength(5);
      // Ensure tips are sorted by carbon savings descending
      for (let i = 0; i < data.tips.length - 1; i++) {
        expect(data.tips[i].savings).toBeGreaterThanOrEqual(data.tips[i + 1].savings);
      }
    });
  });

  describe('Community API', () => {
    it('get community handler should return leaderboard data, activity feed and collective savings', async () => {
      const mockUsers = [
        { id: '1', name: 'Alice', streakCount: 5 },
        { id: '2', name: 'Bob', streakCount: 3 },
      ];
      const mockSavingsGroups = [
        { userId: '1', _sum: { co2Saved: 100 } },
        { userId: '2', _sum: { co2Saved: 50 } },
      ];
      const mockRecentLogs = [
        { id: 'log-1', actionType: 'plant_based_meal', category: 'diet', co2Saved: 1.5, loggedAt: new Date(), user: { name: 'Alice' } },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);
      vi.mocked(prisma.actionLog.groupBy).mockResolvedValue(mockSavingsGroups as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: 'Alice' } as never);
      vi.mocked(prisma.actionLog.findMany).mockResolvedValue(mockRecentLogs as never);
      vi.mocked(prisma.actionLog.aggregate).mockResolvedValue({ _sum: { co2Saved: 150 } } as never);

      const request = new Request('http://localhost/api/community', {
        headers: { 'x-user-id': 'user-123' },
      });

      const response = await getCommunityHandler(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.collectiveSavings).toBe(150);
      expect(data.leaderboard.streaks).toHaveLength(2);
      expect(data.leaderboard.savings).toHaveLength(2);
      expect(data.recentActivity).toHaveLength(1);
      expect(data.recentActivity[0].userName).toBe('Alice');
    });
  });
});
