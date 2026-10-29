process.env.API_DESK_TEST_HOST = 'tauritavern';
process.env.API_DESK_PREVIEW = '1';
await import('./regression.mjs');
