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
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1'
];

const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
const MODEL_DIR = path.join(process.cwd(), 'models');

if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR);

const downloadFile = (file: string) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(MODEL_DIR, file);
    if (fs.existsSync(filePath)) {
      console.log(`Skipping ${file}, already exists.`);
      return resolve(true);
    }
    const dest = fs.createWriteStream(filePath);
    https.get(`${BASE_URL}${file}`, (response) => {
      response.pipe(dest);
      dest.on('finish', () => {
        dest.close();
        console.log(`Downloaded ${file}`);
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      console.error(`Error downloading ${file}: ${err.message}`);
      reject(err);
    });
  });
};

async function downloadModels() {
  console.log('Downloading Face-API models...');
  for (const model of MODELS) {
    await downloadFile(model);
  }
  console.log('All models downloaded successfully!');
}

downloadModels();
