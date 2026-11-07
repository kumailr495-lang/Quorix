// prints the v9 hall table (docs/V9-DESIGN.md section 3): node tools/dev/hall-calc.mjs
import { HALLS, makeHall, hallReport } from '../../www/js/hallmath.js';
for (const s of HALLS) console.log(JSON.stringify(hallReport(makeHall(s))));
