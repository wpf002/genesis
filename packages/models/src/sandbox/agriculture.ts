// Agriculture. First in dependency order: nothing upstream of it.
//
// Yield responds to a climate anomaly drawn from the module's own seeded stream,
// soil depletes with use, storage buffers between years. All INVENTED.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

export function agriculture(params: SandboxParams, region = ''): SimModule {
  const q = (key: string) => (region === '' ? key : `${region}:${key}`);
  const TWO = Fx.fromInt(2);
  const BASE_YIELD = params.get('agriculture.yield.base');

  return {
    id: q('agriculture'),
    stateKeys: ['yieldPerHectare', 'soilQuality', 'storage'],

    init(ctx) {
      ctx.set('yieldPerHectare', BASE_YIELD, [
        params.factor('agriculture.yield.tfp_exponent', BASE_YIELD),
      ]);
      ctx.set('soilQuality', Fx.ONE, [
        params.factor('agriculture.soil.depletion_rate', Fx.ONE),
      ]);
      ctx.set('storage', Fx.ZERO, [
        params.factor('agriculture.storage.spoilage_rate', Fx.ZERO),
      ]);
    },

    tick(ctx) {
      // Anomaly in [-1, 1) from this module's substream.
      const anomaly = Fx.sub(Fx.mul(ctx.rng.nextUnit(), TWO), Fx.ONE);
      const sensitivity = params.get('agriculture.yield.climate_sensitivity');
      const soil = ctx.get(q('agriculture.soilQuality'));

      // Irrigation and technology were computed by their own subsystems and then
      // read by nobody, which is why changing either of them moved terminal
      // population by 0.0%: yield was (base + climate) x soil and nothing else,
      // so the whole model was a food-limited demography with four decorative
      // subsystems attached. Both are read a tick late, which is what the fixed
      // module order buys and costs.
      const irrigation = ctx.get(q('irrigation.yieldBonus'));
      const adopted = ctx.get(q('technology_adoption.adopted'));
      const techWeight = params.get('agriculture.yield.technology_weight');
      const multiplier = Fx.add(Fx.ONE, Fx.add(irrigation, Fx.mul(adopted, techWeight)));

      const climateTerm = Fx.mul(sensitivity, anomaly);
      const nextYield = Fx.max(
        Fx.ZERO,
        Fx.mul(Fx.mul(Fx.add(BASE_YIELD, climateTerm), soil), multiplier),
      );
      ctx.set('yieldPerHectare', nextYield, [
        params.factor('agriculture.yield.tfp_exponent', BASE_YIELD),
        params.factor('agriculture.yield.climate_sensitivity', climateTerm),
        params.factor('agriculture.irrigation.bonus_halfsat', irrigation),
        params.factor('agriculture.yield.technology_weight', Fx.mul(adopted, techWeight)),
      ]);

      // Depletion scales with what is there; regeneration with what is missing,
      // so soil settles at a ratio of the two rather than grinding to the floor.
      const depletion = Fx.mul(soil, params.get('agriculture.soil.depletion_rate'));
      const headroom = Fx.max(Fx.ZERO, Fx.sub(Fx.ONE, soil));
      const regrowth = Fx.mul(headroom, params.get('agriculture.soil.regeneration_rate'));
      const nextSoil = Fx.clamp(Fx.add(Fx.sub(soil, depletion), regrowth), params.get('agriculture.soil.minimum_quality'), Fx.ONE);
      ctx.set('soilQuality', nextSoil, [
        params.factor('agriculture.soil.depletion_rate', Fx.neg(depletion)),
        params.factor('agriculture.soil.regeneration_rate', regrowth),
      ]);

      // Food arrives by road as well as out of the ground. Without this, closing
      // the trade network cost a region nothing at all.
      // Saturating on a fixed reference, not on the port cap. Normalising by the
      // cap made this insensitive in the worst way: volume is clamped to the cap
      // upstream, so the ratio pinned at 1 and raising the cap *lowered* it.
      // Two runs that differed only in trade came out byte-identical.
      const volume = ctx.get(q('trade.volume'));
      const halfsat = params.get('agriculture.storage.import_halfsat');
      const imported = Fx.mul(
        Fx.div(volume, Fx.add(volume, halfsat)),
        params.get('agriculture.storage.import_weight'),
      );

      const stored = ctx.get(q('agriculture.storage'));
      const spoiled = Fx.mul(stored, params.get('agriculture.storage.spoilage_rate'));
      ctx.set(
        'storage',
        Fx.max(Fx.ZERO, Fx.add(Fx.sub(stored, spoiled), Fx.add(nextYield, imported))),
        [
          params.factor('agriculture.storage.spoilage_rate', Fx.neg(spoiled)),
          params.factor('agriculture.storage.import_weight', imported),
        ],
      );
    },
  };
}
