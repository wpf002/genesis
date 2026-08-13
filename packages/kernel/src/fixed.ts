// Fixed-point arithmetic. Locked invariant #1: no floats in simulation state.
//
// A Fixed is a bigint holding a value scaled by FIXED_SCALE. It is branded, so a
// raw bigint cannot be passed where a Fixed is expected. There is deliberately no
// conversion from a non-integer number: every entry point into this module is
// exact, and a float can only get in by going through Fx.parse, which reads a
// decimal string.
//
// Rounding is round-half-away-from-zero, applied in mul and div. Truncation was
// rejected because it biases every product toward zero and the bias accumulates
// over a 5000-year run.

declare const FIXED_BRAND: unique symbol;

export type Fixed = bigint & { readonly [FIXED_BRAND]: true };

export const FIXED_DECIMALS = 6;
export const FIXED_SCALE = 1_000_000n;

const brand = (v: bigint): Fixed => v as Fixed;

function divRoundHalfAway(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError('fixed: division by zero');
  const negative = n < 0n !== d < 0n;
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = an / ad;
  const magnitude = (an % ad) * 2n >= ad ? q + 1n : q;
  return negative ? -magnitude : magnitude;
}

export const Fx = {
  ZERO: brand(0n),
  ONE: brand(FIXED_SCALE),

  /** Exact. Rejects non-integer numbers rather than silently truncating. */
  fromInt(n: bigint | number): Fixed {
    if (typeof n === 'number') {
      if (!Number.isInteger(n)) {
        throw new RangeError(`fixed: ${n} is not an integer; use Fx.parse or Fx.ratio`);
      }
      return brand(BigInt(n) * FIXED_SCALE);
    }
    return brand(n * FIXED_SCALE);
  },

  /** num/den as a Fixed, rounded half away from zero. */
  ratio(num: bigint | number, den: bigint | number): Fixed {
    return brand(divRoundHalfAway(BigInt(num) * FIXED_SCALE, BigInt(den)));
  },

  /** Parses a decimal string exactly. The only textual entry point. */
  parse(text: string): Fixed {
    const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text);
    if (!match) throw new RangeError(`fixed: cannot parse ${JSON.stringify(text)}`);
    const sign = match[1] === '-' ? -1n : 1n;
    const whole = BigInt(match[2] as string);
    const fracText = (match[3] ?? '').padEnd(FIXED_DECIMALS, '0');
    if (fracText.length > FIXED_DECIMALS) {
      throw new RangeError(
        `fixed: ${text} has more than ${FIXED_DECIMALS} decimal places`,
      );
    }
    return brand(sign * (whole * FIXED_SCALE + BigInt(fracText)));
  },

  add: (a: Fixed, b: Fixed): Fixed => brand(a + b),
  sub: (a: Fixed, b: Fixed): Fixed => brand(a - b),
  neg: (a: Fixed): Fixed => brand(-a),
  abs: (a: Fixed): Fixed => brand(a < 0n ? -a : a),

  mul: (a: Fixed, b: Fixed): Fixed => brand(divRoundHalfAway(a * b, FIXED_SCALE)),
  div: (a: Fixed, b: Fixed): Fixed => brand(divRoundHalfAway(a * FIXED_SCALE, b)),

  cmp: (a: Fixed, b: Fixed): number => (a < b ? -1 : a > b ? 1 : 0),
  min: (a: Fixed, b: Fixed): Fixed => (a < b ? a : b),
  max: (a: Fixed, b: Fixed): Fixed => (a > b ? a : b),

  clamp: (v: Fixed, lo: Fixed, hi: Fixed): Fixed => (v < lo ? lo : v > hi ? hi : v),

  /** The underlying scaled integer. For encoding and persistence only. */
  raw: (a: Fixed): bigint => a,
  fromRaw: (raw: bigint): Fixed => brand(raw),

  toString(a: Fixed): string {
    const negative = a < 0n;
    const magnitude = negative ? -a : a;
    const whole = magnitude / FIXED_SCALE;
    const frac = (magnitude % FIXED_SCALE).toString().padStart(FIXED_DECIMALS, '0');
    return `${negative ? '-' : ''}${whole.toString()}.${frac}`;
  },
} as const;
