/**
 * check-integrity.js
 * Scans the src/ directory for non-ASCII characters or suspicious patterns
 * that might indicate LLM hallucination or context corruption (e.g., α, β, etc.)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'src');

const SUSPICIOUS_PATTERN = /[\u0370-\u03FF\u1F00-\u1FFF]/; // Greek and Coptic / Extended Greek

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  let errors = 0;

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      errors += scanDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (SUSPICIOUS_PATTERN.test(line)) {
          console.error(`❌ Suspicious character detected in ${fullPath} at line ${index + 1}:`);
          console.error(`   > ${line.trim()}`);
          errors++;
        }
      });
    }
  });

  return errors;
}

console.log('🔍 Scanning source integrity...');
const totalErrors = scanDir(ROOT);

if (totalErrors > 0) {
  console.error(`\nFound ${totalErrors} integrity issues. Please fix them before committing.`);
  process.exit(1);
} else {
  console.log('✅ Source integrity check passed.');
}
