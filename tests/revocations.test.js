import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

test('build & verify revocations.car', () => {
  if (existsSync('artifacts/revocations.car')) rmSync('artifacts/revocations.car');
  const cid = execSync('npm run -s revocations:build', { encoding: 'utf8' }).trim();
  expect(cid).toMatch(/^baf/);
  const out = execSync('npm run -s revocations:verify', { encoding: 'utf8' });
  expect(out).toContain('OK: revocations match');
});
