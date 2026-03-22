const { Pool } = require('pg');
require('dotenv').config();
const R = '\uFFFD';
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL });

const fixes = [
  // "? Andrea", "? Timucin", "? Porta Deborah" etc → starts with ? = Ö or Ü
  // "?nnisan" → Ünnisan (Turkish female name)
  [`${R}nnisan`, 'Ünnisan'],
  // "?vinusha" → Üvinusha (Indian/Sri Lankan name)
  [`${R}vinusha`, 'Üvinusha'],
  // "?shikha" → Üshikha
  [`${R}shikha`, 'Üshikha'],
  // "?lemezler" → Ölemezler
  [`${R}lemezler`, 'Ölemezler'],
  // "?baran" → Öbaran
  [`${R}baran`, 'Öbaran'],
  // "?lemtzler" → Ölemtzler
  [`${R}lemtzler`, 'Ölemtzler'],
  // "?van" → Övan (likely Ivan with Ö corruption)
  [`${R}van`, 'Övan'],
  // "Bytyq?" → Bytyqë (Albanian surname - ë at end)
  [`Bytyq${R}`, 'Bytyqë'],
  // "?belha" → Öbelha
  [`${R}belha`, 'Öbelha'],
  // "G?nes" → Güneş (Turkish - sun, common surname)
  [`G${R}nes`, 'Güneş'],
  [`g${R}nes`, 'güneş'],
  // "Zurbr?gg" → Zurbrigg
  [`Zurbr${R}gg`, 'Zurbrigg'],
  // "?ller" → Öller
  [`${R}ller`, 'Öller'],
  // "Bj?n" → Björn
  [`Bj${R}n`, 'Björn'],
  // "H?usle" → Häusle
  [`H${R}usle`, 'Häusle'],
  [`H${R}uselman`, 'Häuselman'],
  // "?ste" → Öste (Turkish)
  [`${R}ste`, 'Öste'],
  // "?anl" → Şanl (Turkish)
  [`${R}anl`, 'Şanl'],
  // "el?na" → eléna
  [`el${R}na`, 'eléna'],
  // "?ezsen" → Öezsen
  [`${R}ezsen`, 'Öezsen'],
  // "?l?" → Öl
  [`${R}l${R}`, 'Ölü'],
  [`${R}l `, 'Öl '],
  // "?rami" → Örami
  [`${R}rami`, 'Örami'],
  // "S.kraunb?chler" → S.Kraunbächler
  [`kraunb${R}chler`, 'Kraunbächler'],
  // "?kos" → Ákos (Hungarian male name - á)
  [`${R}kos`, 'Ákos'],
  // "KÖmürc?" → KÖmürcü (already partially fixed)
  [`mürC${R}`, 'mürcü'],
  [`mürc${R}`, 'mürcü'],
  [`Mürci`, 'Mürcü'],
  // "G?nth?r" → Günthür or Günther
  [`G${R}nth${R}r`, 'Günthür'],
  // "m?ssner" → müssner
  [`m${R}ssner`, 'müssner'],
  // "L?hrer" → Lührer
  [`L${R}hrer`, 'Lührer'],
  // "Ebertsh?user" → Ebertshäuser
  [`Ebertsh${R}user`, 'Ebertshäuser'],
  // "D? Peri" → Dö Peri (uncertain - leave as is with Ö)
  [`D${R} `, 'Dö '],
  // standalone ? at start
  [`${R} `, 'Ö '],
];

async function run() {
  let total = 0;
  for (const [wrong, correct] of fixes) {
    const r = await pool.query('UPDATE customers SET name = replace(name, $1, $2)', [wrong, correct]);
    if (r.rowCount > 0) {
      console.log(`[${r.rowCount}] "${wrong.replace(/\uFFFD/g, '?')}" → "${correct}"`);
      total += r.rowCount;
    }
  }
  const rem = await pool.query(`SELECT COUNT(*) as cnt FROM customers WHERE name LIKE '%' || chr(65533) || '%'`);
  console.log(`\nDone. Fixed: ${total} | Remaining: ${rem.rows[0].cnt}`);
  const leftover = await pool.query(`SELECT id, name FROM customers WHERE name LIKE '%' || chr(65533) || '%'`);
  leftover.rows.forEach(r => console.log(`  ID ${r.id}: ${JSON.stringify(r.name)}`));
  await pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
