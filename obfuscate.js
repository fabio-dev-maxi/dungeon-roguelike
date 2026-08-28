const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

function resolveDistFolder() {
  const rootDist = path.join(__dirname, 'dist', 'guglia-cava-roguelike');
  const browserDist = path.join(rootDist, 'browser');

  if (fs.existsSync(browserDist)) {
    return browserDist;
  }
  if (fs.existsSync(rootDist)) {
    return rootDist;
  }

  console.error(`[Errore] Cartella di build non trovata in "${rootDist}". Verifica il nome in angular.json.`);
  process.exit(1);
}

const distFolder = resolveDistFolder();
console.log(`Cartella individuata: ${distFolder}`);

function processFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      processFiles(filePath);
    } else if (file.endsWith('.js')) {
      const code = fs.readFileSync(filePath, 'utf8');
      const obfuscated = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        splitStrings: true
      }).getObfuscatedCode();

      fs.writeFileSync(filePath, obfuscated);
      console.log(`Offuscato con successo: ${file}`);
    }
  });
}

processFiles(distFolder);