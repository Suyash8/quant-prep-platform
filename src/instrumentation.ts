export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv, envSummary } = await import('@/lib/env');
    validateEnv();
    const s = envSummary();
    console.info(
      `[boot] QuantFoundry (${s.nodeEnv}) | db=${s.hasDatabase} email=${s.hasEmail} stripe=${s.hasStripe} runner=${s.hasRunner} sentry=${s.hasSentry}`,
    );
  }
}
