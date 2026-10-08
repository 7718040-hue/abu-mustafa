// Compatibility launcher for local Cloudflare development. No owner bypass.
const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--port','4176'],{stdio:'inherit'});
child.on('exit',code=>process.exit(code||0));
