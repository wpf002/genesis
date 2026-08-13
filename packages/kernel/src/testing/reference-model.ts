// A determinism fixture, not a domain model.
//
// The kernel needs something to run in order to prove it runs the same way twice.
// These three modules exist to exercise fixed-point arithmetic, RNG substreams,
// cross-module reads and the factor ledger. Every constant is INVENTED and none
// of it means anything. Real models live in @genesis/models.

import { Fx, type Fixed } from '../fixed.js';
import type { Factor } from '../ledger/factor.js';
import type { SimModule } from '../tick/loop.js';

const invented = (key: string, contribution: Fixed): Factor => ({
  key,
  provenance: 'INVENTED',
  contribution,
});

const BASE_YIELD = Fx.parse('1.2');
const CLIMATE_SENSITIVITY = Fx.parse('0.15');
const GROWTH_COEFFICIENT = Fx.parse('0.02');
const TWO = Fx.fromInt(2);

export const climateModule: SimModule = {
  id: 'climate',
  stateKeys: ['anomaly'],
  tick(ctx) {
    // Uniform in [-1, 1).
    const anomaly = Fx.sub(Fx.mul(ctx.rng.nextUnit(), TWO), Fx.ONE);
    ctx.set('anomaly', anomaly, [invented('climate.amplitude', Fx.ONE)]);
  },
};

export const yieldModule: SimModule = {
  id: 'yield',
  stateKeys: ['perHectare'],
  init(ctx) {
    ctx.set('perHectare', BASE_YIELD, [invented('yield.base', BASE_YIELD)]);
  },
  tick(ctx) {
    const anomaly = ctx.get('climate.anomaly');
    const contribution = Fx.mul(CLIMATE_SENSITIVITY, anomaly);
    ctx.set('perHectare', Fx.add(BASE_YIELD, contribution), [
      invented('yield.base', BASE_YIELD),
      invented('yield.climate_sensitivity', contribution),
    ]);
  },
};

export const populationModule: SimModule = {
  id: 'population',
  stateKeys: ['count'],
  init(ctx) {
    const initial = Fx.fromInt(1000);
    ctx.set('count', initial, [invented('population.initial', initial)]);
  },
  tick(ctx) {
    const count = ctx.get('population.count');
    const perHectare = ctx.get('yield.perHectare');
    const growth = Fx.mul(Fx.sub(perHectare, Fx.ONE), GROWTH_COEFFICIENT);
    const shock = Fx.ratio(ctx.rng.nextBelow(5), 1000);
    const rate = Fx.sub(growth, shock);
    ctx.set('count', Fx.max(Fx.ZERO, Fx.add(count, Fx.mul(count, rate))), [
      invented('population.growth_coefficient', growth),
      invented('population.shock', Fx.neg(shock)),
    ]);
  },
};

/** Draws nothing, writes nothing, declares no state. */
export const noopModule: SimModule = {
  id: 'noop',
  stateKeys: [],
  tick() {
    // Intentionally empty.
  },
};

export const REFERENCE_MODULES: readonly SimModule[] = [
  climateModule,
  yieldModule,
  populationModule,
];
