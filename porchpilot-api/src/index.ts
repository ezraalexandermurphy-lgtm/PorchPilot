import { buildApp } from './app.js';
import { config } from './config/env.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 PorchPilot API running on http://${config.host}:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();