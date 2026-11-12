import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'server', 'dist');
fs.mkdirSync(path.join(out, 'seed'), { recursive: true });

const copies = [
  [path.join(root, 'server', 'src', 'db', 'schema.sql'), path.join(out, 'schema.sql')],
  [path.join(root, 'server', 'src', 'seed', 'jobs-snapshot.json'), path.join(out, 'seed', 'jobs-snapshot.json')],
];

for (const [from, to] of copies) {
  if (!fs.existsSync(from)) {
    console.error(`Missing build asset: ${from}`);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
  console.log(`copied ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}
