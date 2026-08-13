// Gate fixtures.
//
// Two three-module chains that differ in exactly one parameter's provenance.
// The INVENTED one sits two hops upstream of the output under test, so a gate
// that only inspected direct factors would pass it. That is the point.

import { Fx, Run, type Factor, type Fixed, type SimModule } from '@genesis/kernel';
import { ParamRegistry, type ParamDecl } from '../registry/registry.js';
import { buildDependencyGraph, type DependencyGraph } from '../provenance/graph.js';

const factor = (
  key: string,
  provenance: Factor['provenance'],
  contribution: Fixed,
): Factor => ({ key, provenance, contribution });

const BASE_YIELD = Fx.parse('1.2');
const SENSITIVITY = Fx.parse('0.15');
const GROWTH = Fx.parse('0.02');
const TWO = Fx.fromInt(2);

/** Shared shape; only the sensitivity factor's provenance differs. */
function buildModules(sensitivityProvenance: Factor['provenance']): readonly SimModule[] {
  return [
    {
      id: 'climate',
      stateKeys: ['anomaly'],
      tick(ctx) {
        const anomaly = Fx.sub(Fx.mul(ctx.rng.nextUnit(), TWO), Fx.ONE);
        ctx.set('anomaly', anomaly, [
          factor('climate.anomaly.amplitude', 'ESTIMATED', Fx.ONE),
        ]);
      },
    },
    {
      id: 'yield',
      stateKeys: ['perHectare'],
      tick(ctx) {
        const contribution = Fx.mul(SENSITIVITY, ctx.get('climate.anomaly'));
        ctx.set('perHectare', Fx.add(BASE_YIELD, contribution), [
          factor('agriculture.yield.base', 'CALIBRATED', BASE_YIELD),
          factor('agriculture.yield.climate_sensitivity', sensitivityProvenance, contribution),
        ]);
      },
    },
    {
      id: 'population',
      stateKeys: ['count'],
      init(ctx) {
        ctx.set('count', Fx.fromInt(1000), [
          factor('demography.population.initial', 'CALIBRATED', Fx.fromInt(1000)),
        ]);
      },
      tick(ctx) {
        const count = ctx.get('population.count');
        const rate = Fx.mul(Fx.sub(ctx.get('yield.perHectare'), Fx.ONE), GROWTH);
        ctx.set('count', Fx.add(count, Fx.mul(count, rate)), [
          factor('demography.growth.coefficient', 'CALIBRATED', rate),
        ]);
      },
    },
  ];
}

const BASE_DECLS: readonly ParamDecl[] = [
  {
    key: 'climate.anomaly.amplitude',
    unit: 'degrees',
    provenance: 'ESTIMATED',
    source: 'Fixture placeholder standing in for a paleoclimate reconstruction.',
  },
  {
    key: 'agriculture.yield.base',
    unit: 'tonnes_per_hectare',
    provenance: 'CALIBRATED',
    source: 'Fixture placeholder standing in for a fitted posterior.',
  },
  {
    key: 'demography.population.initial',
    unit: 'people',
    provenance: 'CALIBRATED',
    source: 'Fixture placeholder standing in for HYDE.',
  },
  {
    key: 'demography.growth.coefficient',
    unit: 'fraction_per_year',
    provenance: 'CALIBRATED',
    source: 'Fixture placeholder standing in for a fitted posterior.',
  },
];

function registryWith(sensitivity: ParamDecl): ParamRegistry {
  const registry = new ParamRegistry();
  registry.registerAll([...BASE_DECLS, sensitivity]);
  return registry;
}

export interface Fixture {
  readonly graph: DependencyGraph;
  readonly registry: ParamRegistry;
  readonly output: string;
}

function build(sensitivity: ParamDecl, provenance: Factor['provenance']): Fixture {
  const run = new Run({ seed: 20260806n, modules: buildModules(provenance) });
  run.advanceTo(12);
  return {
    graph: buildDependencyGraph(run.ledger.all()),
    registry: registryWith(sensitivity),
    output: 'population.count',
  };
}

/** Every parameter on the path is CALIBRATED or ESTIMATED. */
export const cleanFixture = (): Fixture =>
  build(
    {
      key: 'agriculture.yield.climate_sensitivity',
      unit: 'tonnes_per_hectare_per_degree',
      provenance: 'CALIBRATED',
      source: 'Fixture placeholder standing in for a fitted posterior.',
    },
    'CALIBRATED',
  );

/** One INVENTED parameter, two hops upstream of population.count. */
export const inventedFixture = (): Fixture =>
  build(
    {
      key: 'agriculture.yield.climate_sensitivity',
      unit: 'tonnes_per_hectare_per_degree',
      provenance: 'INVENTED',
      note: 'Fixture guess, present so the gate has something to refuse.',
    },
    'INVENTED',
  );

/** A parameter nobody registered at all — worse than an invented one. */
export function unregisteredFixture(): Fixture {
  const fixture = build(
    {
      key: 'agriculture.yield.climate_sensitivity',
      unit: 'tonnes_per_hectare_per_degree',
      provenance: 'CALIBRATED',
      source: 'Fixture placeholder standing in for a fitted posterior.',
    },
    'CALIBRATED',
  );
  const registry = new ParamRegistry();
  registry.registerAll(BASE_DECLS);
  return { ...fixture, registry };
}
