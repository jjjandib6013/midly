import fs from 'fs';
import https from 'https';
import path from 'path';

const MODELS = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

// Use jsDelivr CDN which reliably serves the weights from the original repo
const BASE_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';
const MODEL_DIR = path.join(process.cwd(), 'models');

if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR);

const downloadFile = (file: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(MODEL_DIR, file);
    // Delete existing broken files (14 bytes = "404: Not Found")
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > 1000) {
        console.log(`✓ Skipping ${file}, already exists (${(stat.size / 1024).toFixed(0)} KB).`);
        return resolve(true);
      }
      console.log(`✗ Removing broken ${file} (${stat.size} bytes).`);
      fs.unlinkSync(filePath);
    }

    const dest = fs.createWriteStream(filePath);
    const url = `${BASE_URL}${file}`;
    console.log(`↓ Downloading ${file}...`);

    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location!;
        https.get(redirectUrl, (res2) => {
          res2.pipe(dest);
          dest.on('finish', () => {
            dest.close();
            const size = fs.statSync(filePath).size;
            console.log(`  ✓ Downloaded ${file} (${(size / 1024).toFixed(0)} KB)`);
            resolve(true);
          });
        }).on('error', (err) => {
          fs.unlink(filePath, () => {});
          reject(err);
        });
        return;
      }

      if (response.statusCode !== 200) {
        fs.unlink(filePath, () => {});
        console.error(`  ✗ Failed ${file}: HTTP ${response.statusCode}`);
        return reject(new Error(`HTTP ${response.statusCode} for ${file}`));
      }

      response.pipe(dest);
      dest.on('finish', () => {
        dest.close();
        const size = fs.statSync(filePath).size;
        console.log(`  ✓ Downloaded ${file} (${(size / 1024).toFixed(0)} KB)`);
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      console.error(`  ✗ Error downloading ${file}: ${err.message}`);
      reject(err);
    });
  });
};

async function downloadModels() {
  console.log('Downloading Face-API models from jsDelivr CDN...\n');
  for (const model of MODELS) {
    await downloadFile(model);
  }
  console.log('\n✓ All models downloaded successfully!');
}

downloadModels();
