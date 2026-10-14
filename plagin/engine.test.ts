import { DxfCamEngine } from '../src/engine/DxfCamEngine';
import { EnterpriseGeometryEngine } from '../src/engine/EnterpriseGeometryEngine';
import { calculateLaserJobCost } from '../src/engine/pricing';

describe('Axis Lab Pro Engine Tests', () => {
  test('DxfCamEngine parses content correctly', () => {
    const result = DxfCamEngine.parseDxfContent('HEADER...');
    expect(result.isValid).toBe(true);
    expect(result.width).toBe(600);
  });

  test('EnterpriseGeometryEngine optimizes paths', () => {
    const opt = EnterpriseGeometryEngine.optimizePaths([]);
    expect(opt.status).toBe('Optimized for Laser Cutting');
  });

  test('calculateLaserJobCost calculates correct totals', () => {
    const cost = calculateLaserJobCost({
      perimeterMm: 2000,
      areaMm2: 240000,
      materialRate: 100,
      cuttingRatePerMeter: 5,
      quantity: 10
    });
    expect(cost.total).toBeGreaterThan(0);
  });
});