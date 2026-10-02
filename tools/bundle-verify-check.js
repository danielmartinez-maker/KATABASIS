'use strict';
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('katabasis.html', 'utf8');
const scripts = [];
for (const m of html.matchAll(/<script[^>]*src\s*=\s*['"]([^'"]+)['"]/gi)) scripts.push(m[1]);
const links = [];
for (const m of html.matchAll(/<link[^>]*href\s*=\s*['"](?!data:)([^'"]+)['"]/gi)) links.push(m[1]);
console.log('external scripts:', scripts.length, JSON.stringify(scripts.slice(0, 5)));
console.log('external links:', links.length, JSON.stringify(links.slice(0, 5)));
const blocks = [];
for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) blocks.push(m[1]);
console.log('inline blocks:', blocks.length);
let ok = 0;
for (const b of blocks) {
  try { new vm.Script(b); ok++; }
  catch (e) { console.log('PARSE FAIL:', String(e.message).slice(0, 120)); }
}
console.log('parsed:', ok + '/' + blocks.length);
if (scripts.length || links.length || ok !== blocks.length) process.exitCode = 1;
