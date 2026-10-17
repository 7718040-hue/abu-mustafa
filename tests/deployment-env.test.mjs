import assert from 'node:assert/strict';
import {deploymentEnv} from '../scripts/deployment-env.mjs';
const token = 'synthetic_token-123';
const original = {CLOUDFLARE_API_TOKEN: ' \r\n' + token + '\r\n ', KEEP: 'yes'};
const normalized = deploymentEnv(original);
assert.equal(normalized.CLOUDFLARE_API_TOKEN, token);
assert.equal(normalized.KEEP, 'yes');
assert.notEqual(original.CLOUDFLARE_API_TOKEN, token);
assert.equal(deploymentEnv({}).CLOUDFLARE_API_TOKEN, undefined);
for (const value of ['', '  ', 'synthetic\ntoken', 'Bearer ' + token, '"' + token + '"']) {
  assert.throws(() => deploymentEnv({CLOUDFLARE_API_TOKEN: value}), error => {
    assert.match(error.message, /must contain only the token/);
    assert.equal(error.message.includes(token), false);
    return true;
  });
}
console.log('Deployment credential checks passed (synthetic values only)');