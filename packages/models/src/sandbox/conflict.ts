// Conflict. Two subsystems: Lanchester attrition, and the logistics term that
// stops power projecting infinitely far.
//
// One region means there is no map yet, so "reach" stands in for distance. The
// range penalty is applied to it exactly as it will be applied to real distance.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function conflictLanchester(params: SandboxParams): SimModule {
  return {
    id: 'conflict_lanchester',
    stateKeys: ['strength', 'losses'],

    init(ctx) {
      ctx.set('strength', Fx.ZERO, [
        params.factor('conflict.lanchester.exponent', Fx.ZERO),
      ]);
      ctx.set('losses', Fx.ZERO, [
        params.factor('conflict.attrition.baseline', Fx.ZERO),
      ]);
    },

    tick(ctx) {
      // Armies are raised out of surplus, not out of nothing.
      const surplus = ctx.get('economy.surplus');
      const raised = Fx.mul(surplus, Fx.parse('0.1'));
      const strength = Fx.add(ctx.get('conflict_lanchester.strength'), raised);

      // Square-law attrition against a threat that scales with the same mass.
      // exponent is 2, so the squared term is strength * strength.
      const exponent = params.get('conflict.lanchester.exponent');
      const squared = Fx.mul(strength, strength);
      const scale = Fx.add(Fx.ONE, Fx.mul(strength, exponent));
      const attrition = params.get('conflict.attrition.baseline');
      const reach = ctx.get('conflict_logistics.reach');

      const losses = Fx.clamp(
        Fx.mul(Fx.mul(Fx.div(squared, scale), attrition), reach),
        Fx.ZERO,
        strength,
      );

      ctx.set('strength', Fx.max(Fx.ZERO, Fx.sub(strength, losses)), [
        params.factor('conflict.lanchester.exponent', raised),
        params.factor('conflict.attrition.baseline', Fx.neg(losses)),
      ]);
      ctx.set('losses', losses, [
        params.factor('conflict.attrition.baseline', losses),
      ]);
    },
  };
}

export function conflictLogistics(params: SandboxParams): SimModule {
  const NOMINAL_RANGE_KM = Fx.fromInt(500);

  return {
    id: 'conflict_logistics',
    stateKeys: ['reach'],

    init(ctx) {
      ctx.set('reach', Fx.ONE, [
        params.factor('conflict.logistics.range_penalty', Fx.ONE),
      ]);
    },

    tick(ctx) {
      // Reach falls off with distance and recovers with capital: roads, depots.
      const penalty = params.get('conflict.logistics.range_penalty');
      const decay = Fx.mul(penalty, NOMINAL_RANGE_KM);
      const capital = ctx.get('economy.capital');
      const support = Fx.div(capital, Fx.add(capital, Fx.fromInt(10)));

      const reach = Fx.clamp(
        Fx.add(Fx.sub(Fx.ONE, decay), Fx.mul(support, Fx.parse('0.2'))),
        Fx.parse('0.05'),
        Fx.ONE,
      );
      ctx.set('reach', reach, [
        params.factor('conflict.logistics.range_penalty', Fx.neg(decay)),
      ]);
    },
  };
}
