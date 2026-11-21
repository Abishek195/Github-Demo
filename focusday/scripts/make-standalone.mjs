// Post-processes the `--mode standalone` build so it works from file://:
// module scripts are blocked on file:// in most browsers, so we swap
// <script type="module" crossorigin> for a classic deferred script.
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../standalone/index.html', import.meta.url);
let html = readFileSync(file, 'utf8');
html = html
  .replace(/<script type="module" crossorigin src="\.\/app\.js"><\/script>/, '')
  .replace(/<link rel="stylesheet" crossorigin href="\.\/styles\.css">/, '<link rel="stylesheet" href="./styles.css">')
  .replace('</body>', '  <script defer src="./app.js"></script>\n  </body>');
writeFileSync(file, html);
console.log('standalone/index.html ready (open it directly in a browser)');
