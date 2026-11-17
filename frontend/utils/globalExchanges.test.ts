import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFocusCameraPosition,
  GLOBAL_STOCK_EXCHANGES,
  latLngToCartesian,
} from './globalExchanges';

test('GLOBAL_STOCK_EXCHANGES includes BVC Caracas Stock Exchange and major global hubs', () => {
  const codes = new Set(GLOBAL_STOCK_EXCHANGES.map((e) => e.code));
  assert.ok(codes.has('BVC'));
  assert.ok(codes.has('NYSE'));
  assert.ok(codes.has('NSE'));
  assert.ok(codes.has('LSE'));
  assert.ok(codes.has('TSE'));
  assert.ok(GLOBAL_STOCK_EXCHANGES.length >= 18);
});

test('latLngToCartesian places prime meridian equator at +Z and north pole at +Y', () => {
  const origin = latLngToCartesian(0, 0, 1);
  assert.ok(Math.abs(origin.x) < 1e-6);
  assert.ok(Math.abs(origin.y) < 1e-6);
  assert.ok(Math.abs(origin.z - 1) < 1e-6);

  const east90 = latLngToCartesian(0, 90, 1);
  assert.ok(Math.abs(east90.x - 1) < 1e-6);
  assert.ok(Math.abs(east90.y) < 1e-6);
  assert.ok(Math.abs(east90.z) < 1e-6);

  const northPole = latLngToCartesian(90, 0, 2);
  assert.ok(Math.abs(northPole.x) < 1e-6);
  assert.ok(Math.abs(northPole.y - 2) < 1e-6);
  assert.ok(Math.abs(northPole.z) < 1e-6);
});

test('computeFocusCameraPosition preserves requested radial distance', () => {
  const cam = computeFocusCameraPosition(10.4806, -66.9036, 3.0);
  const mag = Math.hypot(cam.x, cam.y, cam.z);
  assert.ok(Math.abs(mag - 3.0) < 1e-6);
  assert.ok(cam.x < 0); // Western hemisphere (-66.9 lng) sits on -X
  assert.ok(cam.y > 0); // Northern hemisphere (+10.48 lat) sits on +Y
});
