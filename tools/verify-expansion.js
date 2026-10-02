'use strict';
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'expansion-verification'));
fs.mkdirSync(out,{recursive:true});
const suites=['smoke.js','boon-regressions.js','debug-regressions.js','quality-regressions.js','combat-stress.js','progression-stress.js','power-regressions.js','deep-interaction-review.js','build-paths.test.js','expansion-catalog.test.js','expansion-stress.js','render-color.test.js','render-regressions.js','asset-decode.test.js','debug-campaign.js','debug-content.js'];
const results=[];
for(const suite of suites) {
  const start=Date.now(),args=[path.join(__dirname,suite)];
  if(suite==='expansion-stress.js')args.push(path.join(out,'mixed-build-results.json'));
  const run=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,timeout:300000});
  const output=(run.stdout||'')+(run.stderr||'')+(run.error?'\n'+run.error.stack:'');
  fs.writeFileSync(path.join(out,suite+'.log'),output);
  const result={suite,ok:run.status===0,exitCode:run.status,elapsedMs:Date.now()-start,summary:output.trim().split(/\r?\n/).slice(-1)[0]};
  results.push(result);console.log((result.ok?'PASS ':'FAIL ')+suite+': '+result.summary);
  if(!result.ok)console.log(output.slice(-5000));
}
const report={ok:results.every(r=>r.ok),verifiedAt:new Date().toISOString(),results};
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
if(!report.ok)process.exitCode=1;
