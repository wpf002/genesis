// Culture. Replicator dynamics over two sects, plus the transmission channel
// that decides how fast the population can change its mind.
//
// Two sects rather than n, because with one region and no map an n-sect
// simulation is a lot of machinery for the same behaviour.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function cultureReplicator(params: SandboxParams): SimModule {
  return {
    id: 'culture_replicator',
    stateKeys: ['sectA', 'sectB'],

    init(ctx) {
      const half = params.get('culture.sect.initial_share');
      ctx.set('sectA', half, [
        params.factor('culture.replicator.selection_strength', half),
      ]);
      ctx.set('sectB', half, [
        params.factor('culture.replicator.selection_strength', half),
      ]);
    },

    tick(ctx) {
      const a = ctx.get('culture_replicator.sectA');
      const b = ctx.get('culture_replicator.sectB');
      const strength = params.get('culture.replicator.selection_strength');
      const churn = ctx.get('culture_transmission.churn');

      // Fitness: A rewards prosperity, B rewards legitimacy. Neither is "right";
      // they are two ways of being adaptive under different conditions.
      const fitnessA = Fx.add(Fx.ONE, Fx.mul(ctx.get('demography.foodRatio'), strength));
      const fitnessB = Fx.add(
        Fx.ONE,
        Fx.mul(ctx.get('politics_legitimacy.legitimacy'), strength),
      );

      const mean = Fx.add(Fx.mul(a, fitnessA), Fx.mul(b, fitnessB));
      const safeMean = Fx.max(mean, Fx.parse('0.000001'));

      // Replicator step, damped by how fast the culture can actually change.
      const targetA = Fx.div(Fx.mul(a, fitnessA), safeMean);
      const deltaA = Fx.mul(Fx.sub(targetA, a), churn);
      const nextA = Fx.clamp(Fx.add(a, deltaA), Fx.ZERO, Fx.ONE);

      ctx.set('sectA', nextA, [
        params.factor('culture.replicator.selection_strength', deltaA),
      ]);
      ctx.set('sectB', Fx.sub(Fx.ONE, nextA), [
        params.factor('culture.replicator.selection_strength', Fx.neg(deltaA)),
      ]);
    },
  };
}

export function cultureTransmission(params: SandboxParams): SimModule {
  return {
    id: 'culture_transmission',
    stateKeys: ['churn', 'novelty'],

    init(ctx) {
      const initial = params.get('culture.transmission.initial_churn');
      ctx.set('churn', initial, [
        params.factor('culture.transmission.initial_churn', initial),
      ]);
      ctx.set('novelty', Fx.ZERO, [
        params.factor('culture.innovation.novelty_rate', Fx.ZERO),
      ]);
    },

    tick(ctx) {
      // Vertical transmission is conservative: the more of it, the slower the
      // culture turns over. Horizontal transmission is what remains.
      const vertical = params.get('culture.transmission.vertical_bias');
      const horizontal = Fx.sub(Fx.ONE, vertical);
      const contact = ctx.get('economy.urbanShare');
      const churn = Fx.clamp(
        Fx.mul(horizontal, Fx.add(params.get('culture.transmission.base_contact'), contact)),
        params.get('culture.transmission.min_churn'),
        Fx.ONE,
      );
      ctx.set('churn', churn, [
        params.factor('culture.transmission.vertical_bias', Fx.neg(vertical)),
      ]);

      const rate = params.get('culture.innovation.novelty_rate');
      const spark = ctx.rng.nextBelow(100) === 0 ? Fx.ONE : Fx.ZERO;
      const novelty = Fx.mul(spark, rate);
      ctx.set('novelty', novelty, [
        params.factor('culture.innovation.novelty_rate', novelty),
      ]);
    },
  };
}
