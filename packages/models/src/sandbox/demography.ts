// Demography. Reads agriculture, feeds economy.
//
// Births track a baseline fertility; deaths rise when food per head falls short.
// A cohort-component model replaces this later; the roadmap's list is the plan,
// this is the placeholder that keeps the dependency order honest.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function demography(params: SandboxParams): SimModule {
  const INITIAL = Fx.fromInt(1000);
  const NEED_PER_HEAD = Fx.parse('0.002');

  return {
    id: 'demography',
    stateKeys: ['population', 'foodRatio'],

    init(ctx) {
      ctx.set('population', INITIAL, [
        params.factor('demography.fertility.baseline', INITIAL),
      ]);
      ctx.set('foodRatio', Fx.ONE, [
        params.factor('demography.migration.push_threshold', Fx.ONE),
      ]);
    },

    tick(ctx) {
      const population = ctx.get('demography.population');
      const storage = ctx.get('agriculture.storage');

      const need = Fx.max(Fx.parse('0.000001'), Fx.mul(population, NEED_PER_HEAD));
      const ratio = Fx.clamp(Fx.div(storage, need), Fx.ZERO, TWO_CAP);
      ctx.set('foodRatio', ratio, [
        params.factor('demography.migration.push_threshold', ratio),
      ]);

      // Births at baseline; deaths scale with the shortfall below one.
      const fertility = params.get('demography.fertility.baseline');
      const births = Fx.mul(population, Fx.div(fertility, Fx.fromInt(100)));

      const shortfall = Fx.max(Fx.ZERO, Fx.sub(Fx.ONE, ratio));
      const elasticity = params.get('demography.mortality.famine_elasticity');
      const mortality = Fx.add(
        params.get('demography.mortality.infant_baseline'),
        Fx.mul(shortfall, elasticity),
      );
      const deaths = Fx.mul(population, Fx.div(mortality, Fx.fromInt(100)));

      ctx.set('population', Fx.max(Fx.ZERO, Fx.add(Fx.sub(population, deaths), births)), [
        params.factor('demography.fertility.baseline', births),
        params.factor('demography.mortality.infant_baseline', Fx.neg(deaths)),
        params.factor('demography.mortality.famine_elasticity', Fx.neg(shortfall)),
      ]);
    },
  };
}

const TWO_CAP = Fx.fromInt(2);
