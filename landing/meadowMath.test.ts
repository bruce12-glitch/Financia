import test from 'node:test';
import assert from 'node:assert/strict';
import {
  astronautClearingFactor,
  generateGrassFieldInstances,
  generateWildflowerInstances,
  meadowGroundHeightAt,
  sunbeamExposureAt,
} from './meadowMath';

test('generateGrassFieldInstances creates exact requested count with finite coordinates', () => {
  const blades = generateGrassFieldInstances(500, 1234);
  assert.equal(blades.length, 500);
  for (const b of blades) {
    assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.z));
    assert.ok(b.height > 0.1 && b.height < 2.0);
    assert.ok(b.width > 0.01 && b.width < 0.1);
    assert.ok(b.sunlit >= 0.1 && b.sunlit <= 1.0);
  }
});

test('astronautClearingFactor lowers grass height near astronaut core and restores it outside', () => {
  const centerFactor = astronautClearingFactor(0.55, -2.85);
  const foregroundFactor = astronautClearingFactor(0, 2.5);
  assert.ok(centerFactor < 0.35);
  assert.equal(foregroundFactor, 1.0);
});

test('meadowGroundHeightAt slopes gently upward toward distant horizon', () => {
  const nearY = meadowGroundHeightAt(0, 3.0);
  const farY = meadowGroundHeightAt(0, -7.0);
  assert.ok(farY > nearY);
});

test('sunbeamExposureAt stays bounded in [0.12, 1.0]', () => {
  for (let x = -8; x <= 8; x += 2) {
    for (let z = -8; z <= 3; z += 2) {
      const val = sunbeamExposureAt(x, z);
      assert.ok(val >= 0.12 && val <= 1.0);
    }
  }
});

test('generateWildflowerInstances produces bounded daisies with positive scale', () => {
  const flowers = generateWildflowerInstances(220);
  assert.ok(flowers.length > 140 && flowers.length <= 220);
  for (const f of flowers) {
    assert.ok(f.stemHeight > 0.15);
    assert.ok(f.flowerScale >= 0.7 && f.flowerScale <= 1.35);
  }
});
