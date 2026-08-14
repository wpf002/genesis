// Demography. Reads agriculture, feeds economy.
//
// Births track a baseline fertility; deaths rise when food per head falls short.
// A cohort-component model replaces this later; the roadmap's list is the plan,
// this is the placeholder that keeps the dependency order honest.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function demography(params: SandboxParams, region = ''): SimModule {
  const q = (key: string) => (region === '' ? key : `${region}:${key}`);
  const INITIAL = params.get('demography.population.initial');
  const NEED_PER_HEAD = params.get('demography.consumption.need_per_head');

  return {
    id: q('demography'),
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
      const population = ctx.get(q('demography.population'));
      const storage = ctx.get(q('agriculture.storage'));

      const need = Fx.max(Fx.parse('0.000001'), Fx.mul(population, NEED_PER_HEAD));
      const ratio = Fx.clamp(Fx.div(storage, need), Fx.ZERO, params.get('demography.consumption.max_food_ratio'));
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

      // Migration ran this tick; disease is read a tick late, which is what the
      // fixed module order buys and costs.
      const leaving = ctx.get(q('migration.outflow'));
      const infectious = ctx.get(q('disease_seird.infectious'));
      const plague = Fx.mul(population, Fx.mul(infectious, params.get('demography.mortality.plague_coefficient')));

      const next = Fx.sub(Fx.add(Fx.sub(population, deaths), births), Fx.add(leaving, plague));
      ctx.set('population', Fx.max(Fx.ZERO, next), [
        params.factor('demography.fertility.baseline', births),
        params.factor('demography.mortality.infant_baseline', Fx.neg(deaths)),
        params.factor('demography.mortality.famine_elasticity', Fx.neg(shortfall)),
        params.factor('demography.migration.push_threshold', Fx.neg(leaving)),
        params.factor('disease.seird.case_fatality', Fx.neg(plague)),
      ]);
    },
  };
}

