/**
 * Canonicalizes lesson interactive-block parameter aliases so all 327 authored
 * interactive blocks feed their intended data into the 44 lab components cleanly.
 */
export function normalizeLabParams(
  component: string,
  raw: Record<string, unknown> | undefined | null,
): Record<string, unknown> {
  const p: Record<string, unknown> = { ...(raw ?? {}) };

  switch (component) {
    case 'FunctionPlotter': {
      if (p.expr !== undefined && p.expression === undefined) p.expression = p.expr;
      if (Array.isArray(p.functions) && p.expressions === undefined) {
        p.expressions = p.functions.map((f) =>
          typeof f === 'string' ? f : (f as { expr?: string; expression?: string; fn?: string })?.expr ?? (f as { expression?: string })?.expression ?? (f as { fn?: string })?.fn,
        ).filter(Boolean);
      }
      break;
    }
    case 'ComplexityCompare': {
      if (p.maxN !== undefined && p.nMax === undefined) p.nMax = p.maxN;
      if (p.xMax !== undefined && p.nMax === undefined) p.nMax = p.xMax;
      if (p.n !== undefined && p.nMax === undefined) p.nMax = p.n;
      const src = p.functions ?? p.series ?? p.curves;
      if (Array.isArray(src) && p.expressions === undefined) {
        const exprs = src
          .map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              const o = item as { expr?: string; expression?: string; fn?: string; formula?: string; label?: string };
              return o.expr ?? o.expression ?? o.fn ?? o.formula;
            }
            return undefined;
          })
          .filter((x): x is string => typeof x === 'string' && x.length > 0);
        if (exprs.length > 0) p.expressions = exprs;
      }
      break;
    }
    case 'RandomWalk': {
      if (p.steps !== undefined && p.n === undefined) p.n = p.steps;
      if (p.maxSteps !== undefined && p.n === undefined) p.n = p.maxSteps;
      break;
    }
    case 'DistributionViewer': {
      if (p.mean !== undefined && p.mu === undefined) p.mu = p.mean;
      if (p.sd !== undefined && p.sigma === undefined) p.sigma = p.sd;
      if (typeof p.lambda === 'number' && p.mu === undefined) {
        p.mu = p.lambda;
        p.sigma = Math.max(0.2, Math.sqrt(Math.max(0.01, p.lambda)));
      }
      if (typeof p.n === 'number' && typeof p.p === 'number' && p.mu === undefined) {
        p.mu = p.n * p.p;
        p.sigma = Math.max(0.2, Math.sqrt(Math.max(0.01, p.n * p.p * (1 - p.p))));
      }
      break;
    }
    case 'MonteCarloPi': {
      if (p.samples !== undefined && p.points === undefined) p.points = p.samples;
      break;
    }
    case 'HashTableVisual': {
      if (p.capacity !== undefined && p.buckets === undefined) p.buckets = p.capacity;
      break;
    }
    case 'YieldCurveLab': {
      if (p.maturities !== undefined && p.tenors === undefined) p.tenors = p.maturities;
      if (p.parYields !== undefined && p.yields === undefined) p.yields = p.parYields;
      if (p.spotRates !== undefined && p.yields === undefined) p.yields = p.spotRates;
      break;
    }
    case 'ConfidenceIntervalLab': {
      if (p.estimate !== undefined && p.diff === undefined) p.diff = p.estimate;
      if (p.xbar !== undefined && p.diff === undefined) p.diff = p.xbar;
      if (typeof p.sd === 'number' && typeof p.n === 'number' && p.n > 0 && p.se === undefined) {
        p.se = p.sd / Math.sqrt(p.n);
      }
      break;
    }
    case 'BlackScholesLab': {
      if (p.volatility !== undefined && p.vol === undefined) p.vol = p.volatility;
      break;
    }
    case 'DerivativeLab': {
      if (p.expr !== undefined && p.function === undefined) p.function = p.expr;
      if (p.x !== undefined && p.point === undefined) p.point = p.x;
      break;
    }
    case 'IntegralLab': {
      if (p.expression !== undefined && p.function === undefined) p.function = p.expression;
      if (p.xmin !== undefined && p.a === undefined) p.a = p.xmin;
      if (p.xmax !== undefined && p.b === undefined) p.b = p.xmax;
      break;
    }
    case 'CompoundGrowth': {
      if (p.annualRate !== undefined && p.rate === undefined) p.rate = p.annualRate;
      break;
    }
    case 'MarkovChainSim': {
      if (p.transitionMatrix !== undefined && p.transitions === undefined) p.transitions = p.transitionMatrix;
      break;
    }
    case 'SortingVisual': {
      if (p.values !== undefined && p.data === undefined) p.data = p.values;
      break;
    }
    case 'VolatilitySmile': {
      if (p.vols !== undefined && p.impliedVols === undefined) p.impliedVols = p.vols;
      break;
    }
    case 'PayoffDiagram': {
      if (Array.isArray(p.range) && p.range.length >= 2) {
        if (p.minSpot === undefined) p.minSpot = p.range[0];
        if (p.maxSpot === undefined) p.maxSpot = p.range[1];
      }
      break;
    }
    default:
      break;
  }

  return p;
}
