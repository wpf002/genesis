// Migration. Runs before demography so the outflow it computes can be applied
// in the same tick rather than a tick late.
//
// People leave when food per head falls below the push threshold. With one
// region there is nowhere to go, so the outflow leaves the system; a destination
// arrives with the second region.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function migration(params: SandboxParams): SimModule {
  return {
    id: 'migration',
    stateKeys: ['outflow', 'pressure'],

    init(ctx) {
      ctx.set('outflow', Fx.ZERO, [
        params.factor('demography.migration.push_threshold', Fx.ZERO),
      ]);
      ctx.set('pressure', Fx.ZERO, [
        params.factor('demography.migration.push_threshold', Fx.ZERO),
      ]);
    },

    tick(ctx) {
      const ratio = ctx.get('demography.foodRatio');
      const threshold = params.get('demography.migration.push_threshold');
      const pressure = Fx.max(Fx.ZERO, Fx.sub(threshold, ratio));
      ctx.set('pressure', pressure, [
        params.factor('demography.migration.push_threshold', pressure),
      ]);

      // A tenth of the shortfall leaves per tick, capped so a bad year cannot
      // empty the region outright.
      const population = ctx.get('demography.population');
      const share = Fx.min(Fx.mul(pressure, Fx.parse('0.1')), Fx.parse('0.05'));
      ctx.set('outflow', Fx.mul(population, share), [
        params.factor('demography.migration.push_threshold', share),
      ]);
    },
  };
}
