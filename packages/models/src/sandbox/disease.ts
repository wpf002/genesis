// Disease. Two subsystems: the SEIRD compartments, and the spatial import
// pressure that seeds them.
//
// Compartments are fractions of the population, carried fixed-point. With one
// region the "spatial" coupling is import pressure riding on trade volume; it
// becomes a real gravity-weighted term when a second region lands.

import { Fx, type SimModule } from '@genesis/kernel';
import type { SandboxParams } from './resolve.js';

const ONE = Fx.ONE;
const HUNDRED = Fx.fromInt(100);

export function diseaseSeird(params: SandboxParams, region = ''): SimModule {
  const q = (key: string) => (region === '' ? key : `${region}:${key}`);
  return {
    id: q('disease_seird'),
    stateKeys: ['susceptible', 'exposed', 'infectious', 'recovered', 'dead'],

    init(ctx) {
      const seed = params.factor('disease.seird.beta_baseline', ONE);
      ctx.set('susceptible', ONE, [seed]);
      ctx.set('exposed', Fx.ZERO, [seed]);
      ctx.set('infectious', Fx.ZERO, [seed]);
      ctx.set('recovered', Fx.ZERO, [seed]);
      ctx.set('dead', Fx.ZERO, [seed]);
    },

    tick(ctx) {
      const s = ctx.get(q('disease_seird.susceptible'));
      const e = ctx.get(q('disease_seird.exposed'));
      const i = ctx.get(q('disease_seird.infectious'));
      const r = ctx.get(q('disease_seird.recovered'));

      const beta = params.get('disease.seird.beta_baseline');
      const pressure = ctx.get(q('disease_spatial.importPressure'));

      // New exposures from local transmission plus imported cases.
      const contact = Fx.add(Fx.mul(beta, i), pressure);
      const newlyExposed = Fx.clamp(Fx.mul(s, contact), Fx.ZERO, s);

      // Incubation: a fixed share of the exposed becomes infectious each tick.
      const incubation = Fx.div(ONE, params.get('disease.seird.incubation_days'));
      const newlyInfectious = Fx.clamp(Fx.mul(e, incubation), Fx.ZERO, e);

      // Removal splits into deaths and recoveries.
      const removalRate = params.get('disease.seird.removal_rate');
      const removed = Fx.clamp(Fx.mul(i, removalRate), Fx.ZERO, i);
      const fatality = params.get('disease.seird.case_fatality');
      const died = Fx.mul(removed, fatality);
      const recoveredNow = Fx.sub(removed, died);

      // Waning immunity returns the recovered to susceptible, so the toy can
      // have more than one epidemic in 5000 years.
      const waning = Fx.mul(r, params.get('disease.seird.waning_rate'));

      ctx.set('susceptible', Fx.clamp(Fx.add(Fx.sub(s, newlyExposed), waning), Fx.ZERO, ONE), [
        params.factor('disease.seird.beta_baseline', Fx.neg(newlyExposed)),
      ]);
      ctx.set('exposed', Fx.max(Fx.ZERO, Fx.add(Fx.sub(e, newlyInfectious), newlyExposed)), [
        params.factor('disease.seird.incubation_days', Fx.neg(newlyInfectious)),
      ]);
      ctx.set('infectious', Fx.max(Fx.ZERO, Fx.add(Fx.sub(i, removed), newlyInfectious)), [
        params.factor('disease.seird.beta_baseline', newlyInfectious),
      ]);
      ctx.set('recovered', Fx.max(Fx.ZERO, Fx.add(Fx.sub(r, waning), recoveredNow)), [
        params.factor('disease.seird.case_fatality', recoveredNow),
      ]);
      ctx.set('dead', Fx.add(ctx.get(q('disease_seird.dead')), died), [
        params.factor('disease.seird.case_fatality', died),
      ]);
    },
  };
}

export function diseaseSpatial(params: SandboxParams, region = ''): SimModule {
  const q = (key: string) => (region === '' ? key : `${region}:${key}`);
  return {
    id: q('disease_spatial'),
    stateKeys: ['importPressure'],

    init(ctx) {
      const initial = params.get('disease.spatial.initial_pressure');
      ctx.set('importPressure', initial, [
        params.factor('disease.spatial.initial_pressure', initial),
      ]);
    },

    tick(ctx) {
      // Traffic carries disease. Volume is capped upstream, so normalise by the
      // cap to keep pressure a fraction.
      const volume = ctx.get(q('trade.volume'));
      const cap = params.get('trade.port.throughput_cap');
      const traffic = Fx.clamp(Fx.div(volume, cap), Fx.ZERO, ONE);
      const coupling = params.get('disease.spatial.coupling_strength');

      // A rare arrival, drawn from this module's own substream.
      const arrival = ctx.rng.nextBelow(params.getInt('disease.spatial.arrival_odds')) === 0
          ? params.get('disease.spatial.arrival_magnitude')
          : Fx.ZERO;
      const pressure = Fx.add(Fx.div(Fx.mul(traffic, coupling), HUNDRED), arrival);

      ctx.set('importPressure', Fx.clamp(pressure, Fx.ZERO, ONE), [
        params.factor('disease.spatial.coupling_strength', pressure),
        params.factor('trade.port.throughput_cap', traffic),
      ]);
    },
  };
}
