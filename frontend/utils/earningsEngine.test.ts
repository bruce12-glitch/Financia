import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUpcomingEarningsCalendar,
  computeCountdownParts,
  filterEarningsEvents,
  mergeFinnhubEarnings,
} from './earningsEngine';

test('buildUpcomingEarningsCalendar returns sorted upcoming events with future timestamps', () => {
  const anchorNow = Date.UTC(2026, 10, 16, 17, 30, 0);
  const events = buildUpcomingEarningsCalendar(anchorNow);

  assert.ok(events.length >= 10);
  for (let i = 0; i < events.length; i++) {
    assert.ok(Date.parse(events[i].reportDateIso) > anchorNow);
    if (i > 0) {
      assert.ok(Date.parse(events[i].reportDateIso) >= Date.parse(events[i - 1].reportDateIso));
    }
  }
});

test('computeCountdownParts accurately formats days, hours, minutes, seconds and due states', () => {
  const nowMs = Date.UTC(2026, 10, 16, 12, 0, 0);
  const targetIn2Days = new Date(nowMs + (2 * 86400 + 5 * 3600 + 9 * 60 + 4) * 1000).toISOString();
  const countdown = computeCountdownParts(targetIn2Days, nowMs);

  assert.equal(countdown.days, 2);
  assert.equal(countdown.hours, 5);
  assert.equal(countdown.minutes, 9);
  assert.equal(countdown.seconds, 4);
  assert.equal(countdown.isDue, false);
  assert.equal(countdown.isSoon, true);
  assert.equal(countdown.formatted, '2d 05h 09m 04s');

  const past = computeCountdownParts(new Date(nowMs - 5000).toISOString(), nowMs);
  assert.equal(past.isDue, true);
  assert.equal(past.formatted, 'Reported / Live');
});

test('filterEarningsEvents filters by market scope and ticker/company search query', () => {
  const events = buildUpcomingEarningsCalendar(Date.UTC(2026, 10, 16, 12, 0, 0));
  const indiaOnly = filterEarningsEvents(events, 'india', '');
  assert.ok(indiaOnly.length >= 3);
  assert.ok(indiaOnly.every((e) => e.market === 'india'));

  const nvdaOnly = filterEarningsEvents(events, 'us', 'nvidia');
  assert.equal(nvdaOnly.length, 1);
  assert.equal(nvdaOnly[0].ticker, 'NVDA');
});

test('mergeFinnhubEarnings cleanly merges live consensus figures when present', () => {
  const baseline = buildUpcomingEarningsCalendar(Date.UTC(2026, 10, 16, 12, 0, 0));
  const merged = mergeFinnhubEarnings(
    {
      earningsCalendar: [
        {
          symbol: 'NVDA',
          date: '2026-11-19',
          epsEstimate: 0.91,
          revenueEstimate: 46_200_000_000,
          hour: 'amc',
        },
      ],
    },
    baseline
  );

  const nvda = merged.find((e) => e.ticker === 'NVDA');
  assert.ok(nvda);
  assert.equal(nvda.epsEstimate, '$0.91');
  assert.equal(nvda.revenueEstimate, '$46.2B');
  assert.equal(nvda.session, 'AMC');
});
