// Assemble chaque page autonome : la feuille et le script communs sont recopiés
// dans la page (aucune dépendance réseau, aucun fichier annexe).
// node build.mjs [dossier-artifact]  -> écrit ../*.html (+ une version sans squelette de index.html)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'shared.css'), 'utf8');
const js = readFileSync(join(here, 'shared.js'), 'utf8');
const pages = ['index.html', 'e1-position-gamme.html', 'e2-math-rythmes-dock.html', 'e3-note-qui-joue.html'];
const artifactDir = process.argv[2];
for (const p of pages) {
  const src = readFileSync(join(here, p), 'utf8');
  const out = src.replace('/*@CSS*/', () => css).replace('/*@JS*/', () => js);
  writeFileSync(join(here, '..', p), out);
  if (artifactDir) {
    mkdirSync(artifactDir, { recursive: true });
    if (p === 'index.html') {
      // la page publiée reçoit son squelette au moment de la publication
      const head = out.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
      const body = out.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
      writeFileSync(join(artifactDir, 'index.html'), head.trim() + '\n' + body.trim() + '\n');
    } else writeFileSync(join(artifactDir, p), out);
  }
}
console.log('ok');
