// Irrigation and trade routes. Both are capital that decays when it is not
// maintained, which is the whole reason they are separate subsystems: the
// interesting behaviour is abandonment, not construction.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function irrigation(params: SandboxParams): SimModule {
  return {
    id: 'irrigation',
    stateKeys: ['capital', 'yieldBonus'],

    init(ctx) {
      ctx.set('capital', Fx.ZERO, [
        params.factor('agriculture.irrigation.capital_decay', Fx.ZERO),
      ]);
      ctx.set('yieldBonus', Fx.ZERO, [
        params.factor('agriculture.irrigation.capital_decay', Fx.ZERO),
      ]);
    },

    tick(ctx) {
      const capital = ctx.get('irrigation.capital');
      const decay = Fx.mul(capital, params.get('agriculture.irrigation.capital_decay'));

      // Built out of economic surplus, and only while the state holds together.
      const surplus = ctx.get('economy.surplus');
      const legitimacy = ctx.get('politics_legitimacy.legitimacy');
      const built = Fx.mul(Fx.mul(surplus, legitimacy), Fx.parse('0.05'));

      const next = Fx.max(Fx.ZERO, Fx.add(Fx.sub(capital, decay), built));
      ctx.set('capital', next, [
        params.factor('agriculture.irrigation.capital_decay', Fx.neg(decay)),
        params.factor('economy.surplus.extraction_rate', built),
      ]);

      // Diminishing returns, so canals cannot make a desert arbitrarily fertile.
      ctx.set('yieldBonus', Fx.div(next, Fx.add(next, Fx.fromInt(5))), [
        params.factor('agriculture.irrigation.capital_decay', next),
      ]);
    },
  };
}

export function tradeRoutes(params: SandboxParams): SimModule {
  return {
    id: 'trade_routes',
    stateKeys: ['reach', 'maintenance'],

    init(ctx) {
      ctx.set('reach', Fx.ONE, [
        params.factor('trade.gravity.distance_exponent', Fx.ONE),
      ]);
      ctx.set('maintenance', Fx.ZERO, [
        params.factor('trade.route.risk_premium', Fx.ZERO),
      ]);
    },

    tick(ctx) {
      // Distance decay: with one region the nominal distance is fixed, and the
      // exponent enters exactly where it will when a real map arrives.
      const exponent = params.get('trade.gravity.distance_exponent');
      const nominal = Fx.fromInt(1000);
      const friction = Fx.div(Fx.mul(nominal, exponent), Fx.fromInt(10000));

      const capital = ctx.get('economy.capital');
      const upkeep = Fx.div(capital, Fx.add(capital, Fx.fromInt(20)));
      ctx.set('maintenance', upkeep, [
        params.factor('trade.route.risk_premium', upkeep),
      ]);

      const reach = Fx.clamp(
        Fx.add(Fx.sub(Fx.ONE, friction), Fx.mul(upkeep, Fx.parse('0.3'))),
        Fx.parse('0.05'),
        Fx.ONE,
      );
      ctx.set('reach', reach, [
        params.factor('trade.gravity.distance_exponent', Fx.neg(friction)),
      ]);
    },
  };
}
