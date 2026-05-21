import { BRICKS } from './src/core/bricks.js';
import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'src', 'data');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(path.join(dir, 'bricks.json'), JSON.stringify(BRICKS, null, 2));
console.log('bricks.json written successfully.');
