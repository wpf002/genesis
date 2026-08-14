// Politics. Legitimacy decays and is bought back with surplus; elites are
// produced by surplus and destabilise the state when there are too many of them
// for the positions available.
//
// The elite-overproduction shape is borrowed from cliodynamics. The numbers are
// not: they are INVENTED and the registry says so.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function politicsLegitimacy(params: SandboxParams): SimModule {
  return {
    id: 'politics_legitimacy',
    stateKeys: ['legitimacy'],

    init(ctx) {
      ctx.set('legitimacy', Fx.ONE, [
        params.factor('politics.legitimacy.decay', Fx.ONE),
      ]);
    },

    tick(ctx) {
      const legitimacy = ctx.get('politics_legitimacy.legitimacy');
      const decay = Fx.mul(legitimacy, params.get('politics.legitimacy.decay'));

      // Full bellies and a working state restore legitimacy; famine and
      // fragmentation eat it.
      const food = ctx.get('demography.foodRatio');
      const fragmentation = ctx.get('politics_elites.fragmentation');
      const restoration = params.get('politics.legitimacy.restoration_rate');
      const restored = Fx.mul(Fx.min(food, Fx.ONE), restoration);

      const next = Fx.clamp(
        Fx.sub(Fx.add(Fx.sub(legitimacy, decay), restored), fragmentation),
        Fx.ZERO,
        Fx.ONE,
      );
      ctx.set('legitimacy', next, [
        params.factor('politics.legitimacy.restoration_rate', restored),
        params.factor('politics.legitimacy.decay', Fx.neg(decay)),
        params.factor('politics.state.fragmentation_pressure', Fx.neg(fragmentation)),
      ]);
    },
  };
}

export function politicsElites(params: SandboxParams): SimModule {
  return {
    id: 'politics_elites',
    stateKeys: ['elites', 'fragmentation'],

    init(ctx) {
      ctx.set('elites', Fx.parse('0.01'), [
        params.factor('politics.elite.overproduction_threshold', Fx.parse('0.01')),
      ]);
      ctx.set('fragmentation', Fx.ZERO, [
        params.factor('politics.state.fragmentation_pressure', Fx.ZERO),
      ]);
    },

    tick(ctx) {
      const elites = ctx.get('politics_elites.elites');
      const surplus = ctx.get('economy.surplus');

      // Elites are produced out of surplus and shed when there is none.
      const produced = Fx.mul(surplus, params.get('politics.elite.production_rate'));
      const shed = Fx.mul(elites, params.get('politics.elite.attrition_rate'));
      const nextElites = Fx.clamp(
        Fx.add(Fx.sub(elites, shed), produced),
        Fx.ZERO,
        Fx.ONE,
      );
      ctx.set('elites', nextElites, [
        params.factor('politics.elite.production_rate', produced),
        params.factor('politics.elite.attrition_rate', Fx.neg(shed)),
      ]);

      // Positions available scale with urbanisation. Past the threshold, the
      // surplus elites turn into fragmentation pressure.
      const positions = Fx.add(ctx.get('economy.urbanShare'), Fx.parse('0.01'));
      const ratio = Fx.div(nextElites, positions);
      const threshold = params.get('politics.elite.overproduction_threshold');
      const excess = Fx.max(Fx.ZERO, Fx.sub(ratio, threshold));
      const pressure = params.get('politics.state.fragmentation_pressure');

      ctx.set('fragmentation', Fx.clamp(Fx.mul(excess, pressure), Fx.ZERO, Fx.ONE), [
        params.factor('politics.elite.overproduction_threshold', excess),
        params.factor('politics.state.fragmentation_pressure', pressure),
      ]);
    },
  };
}
