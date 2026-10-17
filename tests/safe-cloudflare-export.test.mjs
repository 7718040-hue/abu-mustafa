import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {redactDownloadQueries} from '../scripts/safe-cloudflare-export.mjs';

const url='https://storage.example/private.sql?X-Amz-Credential=synthetic-credential&X-Amz-Signature=synthetic-signature';
assert.equal(redactDownloadQueries('download '+url),'download https://storage.example/private.sql?[redacted]');
assert.equal(redactDownloadQueries(JSON.stringify({url})),JSON.stringify({url:'https://storage.example/private.sql?[redacted]'}));
assert.equal(redactDownloadQueries('See https://developers.cloudflare.com/d1/'),'See https://developers.cloudflare.com/d1/');
const moduleUrl=pathToFileURL(resolve('scripts/safe-cloudflare-export.mjs')).href;
const invoke=status=>{
  const cli=`console.log(${JSON.stringify(url)});console.error('synthetic diagnostic 10000');process.exit(${status})`;
  const parent=`import {exportDatabase} from ${JSON.stringify(moduleUrl)};try{exportDatabase(['-e',${JSON.stringify(cli)}],process.env);console.log('NEXT_STEP')}catch(error){console.error(error.message);process.exit(1)}`;
  return spawnSync(process.execPath,['--input-type=module','-e',parent],{encoding:'utf8'});
};
const success=invoke(0);
assert.equal(success.status,0,success.stderr);
assert.match(success.stdout,/NEXT_STEP/);
assert.doesNotMatch(success.stdout+success.stderr,/synthetic-signature|synthetic-credential|X-Amz/);
const failure=invoke(1);
assert.equal(failure.status,1);
assert.match(failure.stderr,/synthetic diagnostic 10000/);
assert.match(failure.stderr,/\?\[redacted\]/);
assert.doesNotMatch(failure.stdout+failure.stderr,/NEXT_STEP|synthetic-signature|synthetic-credential|X-Amz/);
console.log('PASS backup URLs stay out of success/failure logs and failed backup prevents the next step');
