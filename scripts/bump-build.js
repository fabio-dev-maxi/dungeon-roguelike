const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Riconosce formati come "1.0.0" o "1.0.0-12"
const versionRegex = /^(\d+\.\d+\.\d+)(?:-(\d+))?$/;
const match = pkg.version.match(versionRegex);

if (match) {
  const baseVersion = match[1]; // x.y.z
  const currentBuild = match[2] ? parseInt(match[2], 10) : 0; // n
  const newBuild = currentBuild + 1;

  pkg.version = `${baseVersion}-${newBuild}`;

  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`🚀 [Build Bump] Nuova versione: ${pkg.version}`);

  // Includi subito package.json nel commit in corso
  execSync('git add package.json');
} else {
  console.warn('⚠️ [Build Bump] Formato versione non supportato:', pkg.version);
}