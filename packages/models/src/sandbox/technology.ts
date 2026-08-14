// Technology. Diffusion carries ideas between people; adoption is the S-curve
// that decides when a technology stops being a curiosity.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function technologyDiffusion(params: SandboxParams): SimModule {
  return {
    id: 'technology_diffusion',
    stateKeys: ['stock', 'exposure'],

    init(ctx) {
      ctx.set('stock', Fx.ZERO, [
        params.factor('technology.diffusion.contact_rate', Fx.ZERO),
      ]);
      ctx.set('exposure', Fx.ZERO, [
        params.factor('technology.diffusion.contact_rate', Fx.ZERO),
      ]);
    },

    tick(ctx) {
      // Contact rises with urbanisation and trade: cities and roads are how
      // ideas travel.
      const rate = params.get('technology.diffusion.contact_rate');
      const urban = ctx.get('economy.urbanShare');
      const cap = params.get('trade.port.throughput_cap');
      const traffic = Fx.clamp(Fx.div(ctx.get('trade.volume'), cap), Fx.ZERO, Fx.ONE);

      const exposure = Fx.clamp(Fx.mul(rate, Fx.add(urban, traffic)), Fx.ZERO, Fx.ONE);
      ctx.set('exposure', exposure, [
        params.factor('technology.diffusion.contact_rate', exposure),
      ]);

      // Novelty from culture adds to the stock; exposure decides how much of it
      // is retained rather than lost.
      const stock = ctx.get('technology_diffusion.stock');
      const gained = Fx.mul(ctx.get('culture_transmission.novelty'), exposure);
      const forgotten = Fx.mul(stock, params.get('technology.diffusion.forgetting_rate'));
      ctx.set('stock', Fx.max(Fx.ZERO, Fx.add(Fx.sub(stock, forgotten), gained)), [
        params.factor('technology.diffusion.contact_rate', gained),
        params.factor('culture.innovation.novelty_rate', gained),
      ]);
    },
  };
}

export function technologyAdoption(params: SandboxParams): SimModule {
  return {
    id: 'technology_adoption',
    stateKeys: ['adopted'],

    init(ctx) {
      ctx.set('adopted', Fx.ZERO, [
        params.factor('technology.adoption.threshold', Fx.ZERO),
      ]);
    },

    tick(ctx) {
      // Logistic adoption: growth is fastest at the threshold and flattens at
      // both ends. Fixed-point, so the S-curve is built from the same logistic
      // step the rest of the model uses rather than an exponential.
      const adopted = ctx.get('technology_adoption.adopted');
      const stock = ctx.get('technology_diffusion.stock');
      const threshold = params.get('technology.adoption.threshold');

      const available = Fx.clamp(Fx.div(stock, Fx.add(stock, Fx.ONE)), Fx.ZERO, Fx.ONE);
      const pull = Fx.mul(available, Fx.sub(Fx.ONE, adopted));
      const speed = Fx.mul(threshold, params.get('technology.adoption.speed'));
      const next = Fx.clamp(Fx.add(adopted, Fx.mul(pull, speed)), Fx.ZERO, Fx.ONE);

      ctx.set('adopted', next, [
        params.factor('technology.adoption.threshold', Fx.sub(next, adopted)),
      ]);
    },
  };
}
