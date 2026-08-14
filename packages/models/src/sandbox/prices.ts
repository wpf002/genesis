// Grain prices. Splits out of economy so the price mechanism can be reasoned
// about on its own: scarcity raises price, price is bounded, and the elasticity
// is the one knob.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function prices(params: SandboxParams, region = ''): SimModule {
  const q = (key: string) => (region === '' ? key : `${region}:${key}`);
  return {
    id: q('prices'),
    stateKeys: ['grain'],

    init(ctx) {
      ctx.set('grain', Fx.ONE, [
        params.factor('economy.price.elasticity_grain', Fx.ONE),
      ]);
    },

    tick(ctx) {
      // Price is one over supply per head, raised to the elasticity. Rather than
      // a fractional power in fixed point, the elasticity scales the deviation
      // from parity, which is the same shape near 1 and cannot run away.
      const ratio = Fx.max(ctx.get(q('demography.foodRatio')), Fx.parse('0.01'));
      const elasticity = params.get('economy.price.elasticity_grain');
      const deviation = Fx.sub(Fx.div(Fx.ONE, ratio), Fx.ONE);
      const grain = Fx.clamp(
        Fx.add(Fx.ONE, Fx.mul(deviation, elasticity)),
        params.get('economy.price.floor'),
        params.get('economy.price.ceiling'),
      );
      ctx.set('grain', grain, [
        params.factor('economy.price.elasticity_grain', Fx.mul(deviation, elasticity)),
      ]);
    },
  };
}
