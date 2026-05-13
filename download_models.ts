import fs from 'fs';
import https from 'https';
import path from 'path';

// ──────────────────────────────────────────────────────────────────────────
// Face-API weights downloader.
//
// face-api.js loads models by reading a *-weights_manifest.json first, then
// fetching each binary referenced in its `paths` array. Different packages
// ship different weight file layouts (split shards vs single .bin), so
// hardcoding the binary filenames is brittle — it broke us twice in a week.
//
// Strategy: download the 4 manifests first, then read each manifest's
// `paths` array and download those files with the exact names face-api will
// request at load time. No guessing.
// ──────────────────────────────────────────────────────────────────────────

const MANIFESTS = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'face_landmark_68_model-weights_manifest.json',
  'face_recognition_model-weights_manifest.json',
  'face_expression_model-weights_manifest.json',
];

// @vladmandic/face-api is the package we use at runtime, so its weights
// are guaranteed layout-compatible.
const BASE_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
const MODEL_DIR = path.join(process.cwd(), 'models');

if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR);

const downloadFile = (file: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(MODEL_DIR, file);
    // Skip if already present and non-trivial (≥1 KB rules out cached 404 stubs).
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > 1000) {
        console.log(`  ✓ ${file} already cached (${(stat.size / 1024).toFixed(0)} KB)`);
        return resolve();
      }
      fs.unlinkSync(filePath);
    }

    const dest = fs.createWriteStream(filePath);
    const url = `${BASE_URL}${file}`;
    console.log(`  ↓ ${file}`);

    const handleResponse = (response: import('http').IncomingMessage) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location!, handleResponse).on('error', onError);
        return;
      }
      if (response.statusCode !== 200) {
        fs.unlink(filePath, () => {});
        return reject(new Error(`HTTP ${response.statusCode} for ${file}`));
      }
      response.pipe(dest);
      dest.on('finish', () => {
        dest.close();
        const size = fs.statSync(filePath).size;
        console.log(`    ✓ ${(size / 1024).toFixed(0)} KB`);
        resolve();
      });
    };
    const onError = (err: Error) => {
      fs.unlink(filePath, () => {});
      reject(err);
    };

    https.get(url, handleResponse).on('error', onError);
  });
};

async function downloadWithRetry(file: string, maxAttempts = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await downloadFile(file);
      return;
    } catch (err: any) {
      if (err?.message?.startsWith('HTTP 404')) throw err;
      if (attempt === maxAttempts) throw err;
      const backoffMs = 1000 * attempt;
      console.warn(`    ⚠ attempt ${attempt}/${maxAttempts} failed (${err.message}) — retrying in ${backoffMs}ms`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
}

/**
 * Parse a face-api weights manifest and return the list of binary file
 * paths it references. Every manifest is an array of model groups, each
 * with its own `paths: string[]`. We flatten across all groups and dedupe
 * in case the same .bin appears more than once.
 */
function extractPathsFromManifest(manifestPath: string): string[] {
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(raw);
  if (!Array.isArray(manifest)) {
    throw new Error(`Unexpected manifest shape at ${manifestPath} — expected top-level array`);
  }
  const paths = new Set<string>();
  for (const group of manifest) {
    if (!group?.paths || !Array.isArray(group.paths)) continue;
    for (const p of group.paths) paths.add(String(p));
  }
  return [...paths];
}

async function downloadModels() {
  console.log('Downloading Face-API models from jsDelivr (@vladmandic/face-api)...\n');

  // Phase 1: manifests first so we know what binaries to ask for.
  console.log('Manifests:');
  for (const manifest of MANIFESTS) {
    await downloadWithRetry(manifest);
  }

  // Phase 2: binaries referenced by each manifest.
  console.log('\nBinaries:');
  const seen = new Set<string>();
  for (const manifest of MANIFESTS) {
    const manifestFull = path.join(MODEL_DIR, manifest);
    const binaries = extractPathsFromManifest(manifestFull);
    for (const bin of binaries) {
      if (seen.has(bin)) continue;
      seen.add(bin);
      await downloadWithRetry(bin);
    }
  }

  console.log('\n✓ All models downloaded successfully!');
}

downloadModels().catch(err => {
  console.error('\n✗ Model download failed:', err.message);
  process.exit(1);
});
