// The evidence taxonomy.
//
// Every claim the interface makes carries exactly one of these, and they are
// never visually merged. The whole point of the application is the difference
// between what the record says, what the engine computed, and what a person is
// inferring on top.

export type EvidenceClass =
  | 'actual-history'
  | 'simulated'
  | 'knock-on'
  | 'projection'
  | 'interpretive'
  | 'speculative'
  | 'not-modelled';

export interface EvidenceStyle {
  readonly label: string;
  readonly short: string;
  readonly color: string;
  readonly meaning: string;
}

/** Palette holds to the deuteranopia-checked set: blue, yellow, magenta, green, violet. */
export const EVIDENCE: Record<EvidenceClass, EvidenceStyle> = {
  'actual-history': {
    label: 'Actual history',
    short: 'HISTORY',
    color: '#e8e6df',
    meaning: 'From the historical record, with a source. Genesis did not compute it.',
  },
  simulated: {
    label: 'Simulated',
    short: 'SIMULATED',
    color: '#3987e5',
    meaning: 'Genesis output, in a country the intervention was applied to.',
  },
  'knock-on': {
    label: 'Knock-on',
    short: 'KNOCK-ON',
    color: '#199e70',
    meaning:
      'Genesis output somewhere the intervention was never applied, which moved anyway.',
  },
  projection: {
    label: 'Projection',
    short: 'PROJECTION',
    color: '#9085e9',
    meaning: 'Genesis state past AD 2025, where nothing checks the model.',
  },
  interpretive: {
    label: 'Interpretive',
    short: 'INTERPRETIVE',
    color: '#c98500',
    meaning: 'Reasoning about what the model output might mean. Not computed.',
  },
  speculative: {
    label: 'Speculative',
    short: 'SPECULATIVE',
    color: '#d55181',
    meaning: 'A long causal chain with weak historical constraint. Not computed.',
  },
  'not-modelled': {
    label: 'Not modelled',
    short: 'NOT MODELLED',
    color: '#898781',
    meaning: 'Outside the engine’s vocabulary. Named rather than invented.',
  },
};

export const EVIDENCE_ORDER: readonly EvidenceClass[] = [
  'actual-history',
  'simulated',
  'knock-on',
  'projection',
  'interpretive',
  'speculative',
  'not-modelled',
];

/** How completely Genesis can represent a proposed counterfactual mechanism. */
export type Representability = 'full' | 'partial' | 'structural' | 'not-modelled';

export const REPRESENTABILITY: Record<Representability, string> = {
  full: 'Genesis represents this mechanism directly.',
  partial: 'Genesis approximates some of the important mechanisms.',
  structural:
    'Genesis captures the structural shape but not the literal event.',
  'not-modelled': 'Genesis cannot currently represent this causal mechanism.',
};

/**
 * How well history constrains the counterfactual. Qualitative on purpose: these
 * are not probabilities, and locked invariant #6 means Genesis does not produce
 * probabilities over historical counterfactuals at all.
 */
export type Support =
  | 'historically-grounded'
  | 'plausible'
  | 'speculative'
  | 'highly-speculative';

export const SUPPORT: Record<Support, string> = {
  'historically-grounded': 'Strong historical evidence supports the mechanism.',
  plausible: 'Consistent with known constraints.',
  speculative: 'Requires substantial assumptions.',
  'highly-speculative': 'A long causal chain with weak historical constraint.',
};

export const NOT_A_PROBABILITY =
  'Representability and support are qualitative labels. They are not probabilities, and Genesis does not produce probabilities over historical counterfactuals.';
