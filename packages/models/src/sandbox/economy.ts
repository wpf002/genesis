// Economy. Reads demography and agriculture.
//
// A share of output is extracted as surplus, surplus accumulates as capital, and
// capital depreciates. Urbanisation is capped so the toy does not turn every
// farmer into a city dweller.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function economy(params: SandboxParams): SimModule {
  return {
    id: 'economy',
    stateKeys: ['surplus', 'capital', 'urbanShare'],

    init(ctx) {
      ctx.set('surplus', Fx.ZERO, [
        params.factor('economy.surplus.extraction_rate', Fx.ZERO),
      ]);
      ctx.set('capital', Fx.ZERO, [
        params.factor('economy.capital.depreciation', Fx.ZERO),
      ]);
      ctx.set('urbanShare', Fx.ZERO, [
        params.factor('economy.labour.urban_share_cap', Fx.ZERO),
      ]);
    },

    tick(ctx) {
      const storage = ctx.get('agriculture.storage');
      const rate = params.get('economy.surplus.extraction_rate');
      const surplus = Fx.mul(storage, rate);
      ctx.set('surplus', surplus, [
        params.factor('economy.surplus.extraction_rate', surplus),
      ]);

      const capital = ctx.get('economy.capital');
      const depreciation = Fx.mul(capital, params.get('economy.capital.depreciation'));
      ctx.set('capital', Fx.max(Fx.ZERO, Fx.add(Fx.sub(capital, depreciation), surplus)), [
        params.factor('economy.surplus.extraction_rate', surplus),
        params.factor('economy.capital.depreciation', Fx.neg(depreciation)),
      ]);

      // Urban share tracks food ratio, capped.
      const cap = params.get('economy.labour.urban_share_cap');
      const ratio = ctx.get('demography.foodRatio');
      const target = Fx.min(cap, Fx.mul(cap, ratio));
      ctx.set('urbanShare', Fx.max(Fx.ZERO, target), [
        params.factor('economy.labour.urban_share_cap', target),
      ]);
    },
  };
}
