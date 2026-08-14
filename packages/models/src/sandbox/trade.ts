// Trade. Reads economy and demography.
//
// A one-region stand-in for the gravity model: volume scales with economic mass
// and is throttled by a risk premium and a port cap. The distance term arrives
// with the second region, which is why the exponent is declared but not yet used
// in arithmetic — resolve() still checks it exists.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function trade(params: SandboxParams, region = ''): SimModule {
  const q = (key: string) => (region === '' ? key : `${region}:${key}`);
  return {
    id: q('trade'),
    stateKeys: ['volume', 'risk'],

    init(ctx) {
      ctx.set('volume', Fx.ZERO, [params.factor('trade.gravity.mass_exponent', Fx.ZERO)]);
      ctx.set('risk', Fx.ZERO, [params.factor('trade.route.risk_premium', Fx.ZERO)]);
    },

    tick(ctx) {
      // Risk wanders on this module's own substream.
      const draw = ctx.rng.nextUnit();
      const premium = params.get('trade.route.risk_premium');
      const risk = Fx.mul(draw, premium);
      ctx.set('risk', risk, [params.factor('trade.route.risk_premium', risk)]);

      const capital = ctx.get(q('economy.capital'));
      const population = ctx.get(q('demography.population'));
      // mass_exponent is 1, so mass is the plain product. Kept explicit so the
      // exponent has somewhere to go when it stops being 1.
      const mass = Fx.mul(Fx.add(capital, Fx.ONE), Fx.add(population, Fx.ONE));
      const throttled = Fx.mul(mass, Fx.sub(Fx.ONE, risk));
      const cap = params.get('trade.port.throughput_cap');

      ctx.set('volume', Fx.clamp(throttled, Fx.ZERO, cap), [
        params.factor('trade.gravity.mass_exponent', mass),
        params.factor('trade.route.risk_premium', Fx.neg(risk)),
        params.factor('trade.port.throughput_cap', cap),
      ]);
    },
  };
}
