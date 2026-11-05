// Compare the WebAssembly build with the native converter.
//   node tools/bdi-wasm/test_node.js <image.wsq> <convert binary>
// Runs the image and record conversions in both and checks that the bytes
// are identical.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const [wsqPath, convert] = process.argv.slice(2);
const TYPES = ['ANSI', 'ISO', 'ISONC', 'ISOCC'];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bdi-'));

require(path.join(__dirname, 'bc_node.js'))().then(M => {
  const put = b => { const p = M._bc_malloc(b.length || 1); M.HEAPU8.set(b, p); return p; };
  const ptr = () => M._bc_malloc(4), i32 = p => M.getValue(p, 'i32');
  const err = () => M.UTF8ToString(M._bc_last_error());
  const take = (po, pl) => { const p = i32(po), b = M.HEAPU8.slice(p, p + i32(pl)); M._bc_free(p); return b; };
  const native = (input, ti, to) => {
    const i = path.join(tmp, 'in'), o = path.join(tmp, 'out');
    fs.writeFileSync(i, input);
    execFileSync(convert, ['-i', i, '-ti', ti, '-o', o, '-to', to], { stdio: 'ignore' });
    return fs.readFileSync(o);
  };
  let failed = 0;
  const check = (what, a, b) => {
    const same = Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
    if (!same) failed++;
    console.log((same ? 'same  ' : 'DIFFER') + ' ' + what + ' (' + a.length + ' / ' + b.length + ' bytes)');
  };

  const wsq = fs.readFileSync(wsqPath);
  const pin = put(wsq), pr = ptr(), pw = ptr(), ph = ptr(), pp = ptr();
  if (M.ccall('bc_wsq_decode', 'number', Array(6).fill('number'), [pin, wsq.length, pr, pw, ph, pp]))
    throw new Error(err());
  const w = i32(pw), h = i32(ph), ppi = i32(pp), raw = i32(pr);
  const records = {};
  for (const t of TYPES) {
    const po = ptr(), pl = ptr();
    if (M.ccall('bc_raw2fmr', 'number', ['number', 'number', 'number', 'number', 'string', 'number', 'number'],
                [raw, w, h, ppi, t, po, pl])) throw new Error(t + ': ' + err());
    records[t] = take(po, pl);
    check('image -> ' + t, records[t], native(wsq, 'WSQ', t));
  }
  for (const a of TYPES) for (const b of TYPES) {
    const pi = put(records[a]), po = ptr(), pl = ptr();
    if (M.ccall('bc_fmr2fmr', 'number', ['number', 'number', 'string', 'string', 'number', 'number'],
                [pi, records[a].length, a, b, po, pl])) throw new Error(a + '->' + b + ': ' + err());
    check(a + ' -> ' + b, take(po, pl), native(records[a], a, b));
  }
  const po = ptr(), pl = ptr();
  const bad = M.ccall('bc_raw2fmr', 'number', ['number', 'number', 'number', 'number', 'string', 'number', 'number'],
                      [raw, w, h, ppi, 'XYZ', po, pl]);
  if (bad !== -1 || !err()) { failed++; console.log('DIFFER unknown type not reported'); }
  else console.log('error  unknown type: ' + err());
  fs.rmSync(tmp, { recursive: true });
  console.log(failed ? failed + ' difference(s)' : 'WebAssembly and native builds give identical records');
  process.exit(failed ? 1 : 0);
});
