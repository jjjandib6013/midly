import { Worker } from 'bullmq';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Use pure JS TensorFlow (no native bindings required)
import * as tf from '@tensorflow/tfjs';
import * as canvas from 'canvas';
// Use WASM backend (no native C++ bindings needed)
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { decrypt } from './cryptoUtils';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const prisma = new PrismaClient();
const MODEL_DIR = path.join(process.cwd(), 'models');
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// ==========================================
// S3 CLIENT (reuse config from server/config/s3.ts)
// ==========================================
const s3Client = (process.env.AWS_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) ? new S3Client({
    region: process.env.AWS_REGION || 'auto',
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
}) : null;

// Name stop-words to filter from Philippine ID name matching
const NAME_STOP_WORDS = ['jr', 'sr', 'iii', 'ii', 'iv', 'v', 'the', 'de', 'del', 'dela', 'delos', 'las', 'los', 'san', 'ng', 'mga'];

// Monkey patch node canvas for face-api
const { Canvas, Image, ImageData } = canvas;
(faceapi.env as any).monkeyPatch({ Canvas, Image, ImageData, readFile: fs.promises.readFile });

let modelsLoaded = false;
async function loadModels() {
    if (modelsLoaded) return;
    try {
        await tf.ready();
        console.log(`[AI Worker] TensorFlow backend: ${tf.getBackend()}`);
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_DIR);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_DIR);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_DIR);
        await faceapi.nets.faceExpressionNet.loadFromDisk(MODEL_DIR);
        modelsLoaded = true;
        console.log('[AI Worker] FaceAPI Models loaded (pure JS backend, with expressions).');
    } catch (e) {
        console.error("[AI Worker] Failed to load FaceAPI models:", e);
    }
}

// ==========================================
// S3 DOWNLOAD HELPER (#6)
// ==========================================
async function downloadFromS3(s3Key: string): Promise<string> {
    if (!s3Client) throw new Error('S3 client not configured');

    const tmpDir = path.join(os.tmpdir(), 'midly-kyc');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const tmpPath = path.join(tmpDir, `${crypto.randomUUID()}${path.extname(s3Key)}`);

    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: s3Key,
    });

    const response = await s3Client.send(command);
    const stream = response.Body as Readable;

    return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tmpPath);
        stream.pipe(writeStream);
        writeStream.on('finish', () => resolve(tmpPath));
        writeStream.on('error', reject);
    });
}

function cleanupTempFile(filePath: string) {
    try {
        if (filePath.includes(os.tmpdir()) && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (e) {
        console.error('[AI Worker] Failed to cleanup temp file:', e);
    }
}

// Resolve a file path: if it's an S3 key, download; otherwise use local
async function resolveFilePath(filePathOrKey: string): Promise<{ localPath: string; isTemp: boolean }> {
    // If it starts with 'kyc/' or 'uploads/', it's an S3 key
    if (s3Client && (filePathOrKey.startsWith('kyc/') || filePathOrKey.startsWith('uploads/'))) {
        const localPath = await downloadFromS3(filePathOrKey);
        return { localPath, isTemp: true };
    }
    // Otherwise it's a local filesystem path
    return { localPath: filePathOrKey, isTemp: false };
}

// ==========================================
// TEXT SIMILARITY UTILITIES
// ==========================================
function levenshteinDistance(s1: string, s2: string): number {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    const costs = new Array(s2.length + 1);
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i == 0) costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

function stringSimilarity(s1: string, s2: string): number {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) { longer = s2; shorter = s1; }
    let longerLength = longer.length;
    if (longerLength == 0) return 1.0;
    return (longerLength - levenshteinDistance(longer, shorter)) / parseFloat(longerLength.toString());
}

// ==========================================
// FETCH PLATFORM SETTINGS (#5)
// ==========================================
async function getThresholds(): Promise<{ biometricThreshold: number; reviewThreshold: number }> {
    try {
        const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
        return {
            biometricThreshold: settings?.kyc_biometric_threshold ?? 0.55,
            reviewThreshold: settings?.kyc_review_threshold ?? 0.45,
        };
    } catch {
        return { biometricThreshold: 0.55, reviewThreshold: 0.45 };
    }
}

// ==========================================
// PHASE 2: DOCUMENT VERIFICATION
// ==========================================
export async function processKycPhase2(jobData: any) {
    const { kycId, filePath, idType, idNumberEncrypted, idNameEncrypted, birthdate } = jobData;
    console.log(`[AI Worker] Phase 2 processing for KYC ID: ${kycId}`);

    let resolvedFile: { localPath: string; isTemp: boolean } | null = null;

    try {
        await loadModels();

        // Resolve file (S3 download or local) (#6)
        resolvedFile = await resolveFilePath(filePath);
        const actualPath = resolvedFile.localPath;

        // Validate minimum dimensions (#10)
        const metadata = await sharp(actualPath).metadata();
        if (!metadata.width || !metadata.height || metadata.width < 800 || metadata.height < 500) {
            throw new Error("Rejected: Image resolution is too low. Minimum 800×500 pixels required for reliable verification.");
        }

        // 1. Prepare Image
        const buffer = await sharp(actualPath).resize(1200).toBuffer();

        // Image Quality Pre-check: Don't waste compute on black or blown-out images
        const stats = await sharp(buffer).stats();
        const luminance = stats.channels[0].mean;
        if (luminance < 30) {
            throw new Error("Rejected: Image is too dark. Please use better lighting and try again.");
        }
        if (luminance > 220) {
            throw new Error("Rejected: Image is washed out or glaring. Please remove flash and try again.");
        }
        const rawImg = await sharp(buffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // 2. JSQR Decoding (First Priority)
        const jsQR = require('jsqr');
        const code = jsQR(new Uint8ClampedArray(rawImg.data), rawImg.info.width, rawImg.info.height);

        const idNumber = decrypt(idNumberEncrypted);
        const idName = decrypt(idNameEncrypted);
        const textLowerIdName = idName.toLowerCase();

        let foundData = false;

        if (code && code.data) {
            console.log(`[AI Worker] QR Code Detected! Payload:`, code.data);
            const qrText = code.data.toLowerCase();
            const nameParts = textLowerIdName.split(' ').filter((p: string) => !NAME_STOP_WORDS.includes(p));
            let nameHits = nameParts.filter((p: string) => p.length > 2 && qrText.includes(p)).length;

            if (nameHits >= 1 || qrText.includes(idNumber.toLowerCase())) {
                foundData = true;
                console.log(`[AI Worker] QR Code strongly validated Identity.`);
            }
        }

        // 3. OCR (Fallback Priority) — Enhanced for Philippine IDs (#3)
        let rawOcrText = '';
        if (!foundData) {
            console.log(`[AI Worker] Falling back to enhanced OCR pipeline...`);

            // Enhanced preprocessing: grayscale and normalize contrast.
            // Removed aggressive thresholding which was breaking Tesseract (Image too small to scale error).
            const optimizedBuffer = await sharp(buffer)
                .grayscale()
                .normalize()
                .toBuffer();

            // Use eng+fil for Philippine IDs with mixed Filipino/English text (#3)
            const { data: { text } } = await Tesseract.recognize(optimizedBuffer, 'eng+fil');
            rawOcrText = text;

            // Clean text by replacing non-alphanumeric (except spaces and Ñ) with spaces, and normalizing whitespace
            const cleanText = text.replace(/[^a-zA-Z0-9\sñÑ]/g, ' ').replace(/\s+/g, ' ').trim();
            const rawWords = cleanText.split(' ').map((w: string) => w.toLowerCase());

            // Filter stop words from name parts (#3)
            const nameParts = textLowerIdName.split(' ').filter((p: string) => p.length >= 3 && !NAME_STOP_WORDS.includes(p));
            let nameHits = 0;

            // Strict Levenshtein based Word Matching (Looking for 80% similarity on Names)
            for (const part of nameParts) {
                let matched = false;
                for (const word of rawWords) {
                    if (word.length >= 3 && stringSimilarity(word, part) > 0.80) {
                        matched = true;
                        break;
                    }
                }
                if (matched) nameHits++;
            }

            // Robust ID Match: Strip all spaces and punctuation from both input and OCR text
            const normalizedInputId = idNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const normalizedOcrText = cleanText.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            
            // Sliding-window fuzzy search for the ID within the full OCR text (allows 20% error margin)
            let hasExactIdMatch = false;
            if (normalizedInputId.length >= 5) {
                const maxErrors = Math.floor(normalizedInputId.length * 0.2);
                for (let i = 0; i <= normalizedOcrText.length - normalizedInputId.length; i++) {
                    let errors = 0;
                    for (let j = 0; j < normalizedInputId.length; j++) {
                        if (normalizedOcrText[i + j] !== normalizedInputId[j]) {
                            errors++;
                            if (errors > maxErrors) break;
                        }
                    }
                    if (errors <= maxErrors) {
                        hasExactIdMatch = true;
                        break;
                    }
                }
            }

            // Dynamic threshold: require 60% of name parts to match instead of hardcoded >= 2 (#3)
            const requiredHits = Math.max(1, Math.floor(nameParts.length * 0.6));
            console.log(`[AI Worker] OCR Exact ID Match: ${hasExactIdMatch}, Name Hits: ${nameHits}/${nameParts.length} (required: ${requiredHits})`);

            if (hasExactIdMatch || nameHits >= requiredHits) {
                foundData = true;
                console.log(`[AI Worker] Strict Validation Passed on OCR.`);
            }
        }

        // 4. Face Detection on Document
        // Use canvas.loadImage to properly await the image decoding so width/height are set
        const idImg = await canvas.loadImage(buffer);

        // Lower confidence heavily to handle glare, print artifacts, and watermarks on physical IDs
        // Phase 3 biometric matching will catch false positives anyway
        const detectOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.15 });
        const allDetections = await faceapi.detectAllFaces(idImg as any, detectOptions)
            .withFaceLandmarks()
            .withFaceDescriptors();

        if (!allDetections || allDetections.length === 0) {
            throw new Error("Rejected: No human face detected on provided ID document. Ensure the image is clear and glare-free.");
        }

        // Sort faces by bounding box area (largest first) to ensure we pick the Primary ID Photo, not the ghost
        allDetections.sort((a: any, b: any) => {
            const areaA = a.detection.box.width * a.detection.box.height;
            const areaB = b.detection.box.width * b.detection.box.height;
            return areaB - areaA;
        });

        const idDetection = allDetections[0]; // The largest face
        if (!foundData) {
            throw new Error("Rejected: Submitted ID number does not match the physical document text or QR Code.");
        }

        console.log(`[AI Worker] Phase 2 Document Validated. Saving Face Descriptor and Phase.`);

        // DB Update — store descriptor as Float[], and log raw OCR text (#2, #3)
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: {
                status: 'phase2_verified',
                face_descriptor: Array.from(idDetection.descriptor) as number[],
                ocr_raw_text: rawOcrText.substring(0, 5000), // Cap at 5000 chars
            }
        });

    } catch (error: any) {
        console.error(`[AI Worker] Error Phase 2 for KYC ${kycId}:`, error);
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: { status: 'rejected', rejection_reason: error.message || 'Unknown processing error.' }
        });
    } finally {
        // Cleanup temp file if downloaded from S3
        if (resolvedFile?.isTemp) cleanupTempFile(resolvedFile.localPath);
    }
}

// ==========================================
// PHASE 3: LIVENESS + BIOMETRIC VERIFICATION
// ==========================================
export async function processKycPhase3(jobData: any) {
    const { kycId, livenessFrames, livenessFilePath } = jobData;
    console.log(`[AI Worker] Phase 3 Liveness Matrix processing for KYC ID: ${kycId}`);

    const tempFiles: string[] = [];

    try {
        await loadModels();
        const { biometricThreshold, reviewThreshold } = await getThresholds();

        const kycRecord = await prisma.kycVerification.findUnique({ where: { kyc_id: kycId } });
        if (!kycRecord || !kycRecord.face_descriptor || kycRecord.face_descriptor.length === 0) {
            throw new Error("Missing Phase 2 document record.");
        }

        // Direct Float32Array creation — no more defensive workaround (#2)
        const savedDescriptor = new Float32Array(kycRecord.face_descriptor);

        if (savedDescriptor.length !== 128) {
            throw new Error("Rejected: Corrupted biometric baseline descriptor stored in Database.");
        }

        // ==========================================
        // MULTI-FRAME LIVENESS DETECTION (#4)
        // ==========================================
        const frames: string[] = livenessFrames || [];

        // Fallback: if only a single livenessFilePath is provided (legacy), use it
        if (frames.length === 0 && livenessFilePath) {
            const resolvedFile = await resolveFilePath(livenessFilePath);
            if (resolvedFile.isTemp) tempFiles.push(resolvedFile.localPath);

            // Process single frame (legacy path)
            const selfieBuffer = await sharp(resolvedFile.localPath).resize(800).toBuffer();
            const selfieImg = new Image();
            selfieImg.src = selfieBuffer;
            const selfieDetection = await faceapi.detectSingleFace(selfieImg as any).withFaceLandmarks().withFaceDescriptor();

            if (!selfieDetection) {
                throw new Error("Rejected: Could not detect human face in live selfie.");
            }

            const distance = faceapi.euclideanDistance(savedDescriptor, selfieDetection.descriptor);
            console.log(`[AI Worker] Biometric Euclidean Distance: ${distance}`);

            await finalizePhase3(kycId, distance, biometricThreshold, reviewThreshold);
            return;
        }

        if (frames.length < 3) {
            throw new Error("Rejected: Insufficient liveness frames. At least 3 frames are required.");
        }

        console.log(`[AI Worker] Processing ${frames.length} liveness frames for challenge verification...`);

        // Decode base64 frames and run face detection on each
        const detections: any[] = [];

        for (let i = 0; i < frames.length; i++) {
            const base64Data = frames[i].replace(/^data:image\/\w+;base64,/, '');
            const frameBuffer = Buffer.from(base64Data, 'base64');
            const resizedBuffer = await sharp(frameBuffer).resize(640).toBuffer();
            const img = new Image();
            img.src = resizedBuffer;

            const detection = await faceapi.detectSingleFace(img as any)
                .withFaceLandmarks()
                .withFaceDescriptor()
                .withFaceExpressions();

            if (detection) {
                detections.push(detection);
            }
        }

        if (detections.length < 2) {
            throw new Error("Rejected: Could not reliably detect face across liveness frames. Ensure good lighting and face the camera directly.");
        }

        // ==========================================
        // LIVENESS CHECKS
        // ==========================================

        // Check 1: Face must be large enough in the frame (rejects distant photo-of-photo)
        const imgWidth = 640;
        for (const det of detections) {
            const faceArea = det.detection.box.width * det.detection.box.height;
            const frameArea = imgWidth * imgWidth; // approximate
            const faceRatio = faceArea / frameArea;
            if (faceRatio < 0.04) { // Face must be at least 4% of frame
                throw new Error("Rejected: Face is too small in the frame. Please hold the camera closer.");
            }
        }

        // Check 2: Blink detection — check eye landmark y-coordinate variance across frames
        // Face landmarks 36-41 = left eye, 42-47 = right eye
        const eyeAspectRatios: number[] = [];
        for (const det of detections) {
            const landmarks = det.landmarks.positions;
            // Left eye: points 37,38 (top), 40,41 (bottom)
            const leftEyeTop = (landmarks[37].y + landmarks[38].y) / 2;
            const leftEyeBottom = (landmarks[40].y + landmarks[41].y) / 2;
            const leftEyeWidth = Math.abs(landmarks[36].x - landmarks[39].x);
            const leftEAR = Math.abs(leftEyeBottom - leftEyeTop) / (leftEyeWidth || 1);

            // Right eye: points 43,44 (top), 46,47 (bottom)
            const rightEyeTop = (landmarks[43].y + landmarks[44].y) / 2;
            const rightEyeBottom = (landmarks[46].y + landmarks[47].y) / 2;
            const rightEyeWidth = Math.abs(landmarks[42].x - landmarks[45].x);
            const rightEAR = Math.abs(rightEyeBottom - rightEyeTop) / (rightEyeWidth || 1);

            const avgEAR = (leftEAR + rightEAR) / 2;
            eyeAspectRatios.push(avgEAR);
        }

        // Variance in eye aspect ratio — a real person blinks, causing variation
        const earMean = eyeAspectRatios.reduce((a, b) => a + b, 0) / eyeAspectRatios.length;
        const earVariance = eyeAspectRatios.reduce((sum, ear) => sum + Math.pow(ear - earMean, 2), 0) / eyeAspectRatios.length;

        console.log(`[AI Worker] Eye Aspect Ratio variance: ${earVariance.toFixed(6)} (mean: ${earMean.toFixed(4)})`);

        // Check 3: Head movement — nose tip x-offset variance across frames
        const noseTipXOffsets: number[] = [];
        for (const det of detections) {
            const landmarks = det.landmarks.positions;
            const noseTip = landmarks[30]; // Nose tip
            const faceCenter = det.detection.box.x + det.detection.box.width / 2;
            const xOffset = (noseTip.x - faceCenter) / det.detection.box.width;
            noseTipXOffsets.push(xOffset);
        }

        const noseVariance = noseTipXOffsets.reduce((sum, offset) => {
            const mean = noseTipXOffsets.reduce((a, b) => a + b, 0) / noseTipXOffsets.length;
            return sum + Math.pow(offset - mean, 2);
        }, 0) / noseTipXOffsets.length;

        console.log(`[AI Worker] Nose tip X-offset variance: ${noseVariance.toFixed(6)}`);

        // Combined liveness score — printed photos have near-zero variance
        const livenessScore = earVariance + noseVariance;
        const LIVENESS_THRESHOLD = 0.0001; // Extremely low variance = likely static photo

        if (livenessScore < LIVENESS_THRESHOLD) {
            console.log(`[AI Worker] Liveness check FAILED. Score: ${livenessScore.toFixed(8)} (threshold: ${LIVENESS_THRESHOLD})`);
            throw new Error("Rejected: Liveness check failed. The system detected a static image instead of a live person. Please face the camera directly, blink naturally, and move your head slightly.");
        }

        console.log(`[AI Worker] Liveness check PASSED. Score: ${livenessScore.toFixed(6)}`);

        // ==========================================
        // BIOMETRIC MATCHING (use first detection with valid descriptor)
        // ==========================================
        const primaryDetection = detections[0];
        const distance = faceapi.euclideanDistance(savedDescriptor, primaryDetection.descriptor);
        console.log(`[AI Worker] Biometric Euclidean Distance: ${distance}`);

        await finalizePhase3(kycId, distance, biometricThreshold, reviewThreshold);

    } catch (error: any) {
        console.error(`[AI Worker] Fatal Error Phase 3 for KYC ${kycId}:`, error);
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: { status: 'rejected', rejection_reason: error.message || 'Unknown verification error' }
        });

        // Disk-fill DoS Prevention: Clean up rejected selfie from local disk (#6)
        try {
            const selfieImage = await prisma.kycImage.findFirst({
                where: { kyc_id: kycId, image_type: 'Selfie' }
            });
            if (selfieImage && selfieImage.file_path.startsWith('/uploads/kyc/')) {
                const localFile = path.join(process.cwd(), selfieImage.file_path);
                if (fs.existsSync(localFile)) fs.unlinkSync(localFile);
            }
        } catch (cleanupErr) {
            console.error(`[AI Worker] Failed to cleanup rejected selfie:`, cleanupErr);
        }
    } finally {
        // Cleanup any temp files
        for (const f of tempFiles) cleanupTempFile(f);
    }
}

// ==========================================
// FINALIZE PHASE 3 (#5, #7)
// ==========================================
async function finalizePhase3(kycId: number, distance: number, biometricThreshold: number, reviewThreshold: number) {
    // Guard against NaN
    if (isNaN(distance) || distance <= 0) {
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: {
                status: 'rejected',
                match_distance: distance || null,
                rejection_reason: 'Biometric computation error — invalid distance value.'
            }
        });
        return;
    }

    // Store the match distance regardless of outcome (#5)
    if (distance < reviewThreshold) {
        // Strong match — auto-verify
        console.log(`[AI Worker] KYC Fully Verified! Match Distance: ${distance} (< review threshold ${reviewThreshold})`);
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: { status: 'verified', rejection_reason: null, match_distance: distance }
        });
    } else if (distance < biometricThreshold) {
        // Borderline — send to admin review (#7)
        console.log(`[AI Worker] KYC borderline. Distance: ${distance} (between ${reviewThreshold} and ${biometricThreshold}). Sending to admin review.`);
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: {
                status: 'pending_review',
                match_distance: distance,
                rejection_reason: `Borderline biometric match (distance: ${distance.toFixed(4)}). Requires manual admin review.`
            }
        });
    } else {
        // Hard rejection
        console.log(`[AI Worker] KYC Rejected. Distance: ${distance} (>= threshold ${biometricThreshold})`);
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: {
                status: 'rejected',
                match_distance: distance,
                rejection_reason: 'Live selfie does not strictly match the provided ID document.'
            }
        });
    }
}

// ==========================================
// AUTO-RELEASE HANDLER
// ==========================================
export async function processAutoRelease(data: { tradeId: number }) {
    const { tradeId } = data;
    console.log(`[AI Worker] Processing auto-release for Trade ID ${tradeId}`);

    try {
        await prisma.$transaction(async (tx) => {
            // Re-fetch trade inside the serializable transaction to prevent race conditions (Issue #5)
            const freshTrade = await tx.transaction.findUnique({
                where: { transaction_id: tradeId },
                include: { payment: true }
            });

            if (!freshTrade) throw new Error('Trade not found');

            // If it's already disputed, released, or frozen, abort.
            if (freshTrade.status !== 'verifying' || freshTrade.payment?.vault_status === 'frozen') {
                console.log(`[AI Worker] Auto-release aborted for Trade ID ${tradeId} - status changed to ${freshTrade.status}/${freshTrade.payment?.vault_status}`);
                return;
            }

            // Execute auto-release
            await tx.transaction.update({
                where: { transaction_id: tradeId },
                data: {
                    status: 'completed'
                }
            });

            // Queue the crypto-shredder for 72 hours from now
            const { kycQueue } = require('./queue');
            await kycQueue.add('crypto-shredder', { tradeId }, { delay: 72 * 60 * 60 * 1000 });

            if (freshTrade.payment) {
                await tx.payment.update({
                    where: { payment_id: freshTrade.payment.payment_id },
                    data: { vault_status: 'released', release_date: new Date() }
                });
            }

            const amount = Number(freshTrade.total_amount);

            // Release funds to seller
            await tx.user.update({
                where: { user_id: freshTrade.seller_id },
                data: {
                    wallet_balance: { increment: amount },
                    reputation_score: { increment: 0.01 } // Issue #9: Increase reputation
                }
            });

            // Notify
            await tx.notification.create({
                data: {
                    user_id: freshTrade.seller_id,
                    message: `Auto-release completed for Trade #${tradeId}. ₱${amount.toFixed(2)} has been credited to your wallet.`,
                    type: 'system_alert',
                    reference_id: tradeId
                }
            });

            await tx.notification.create({
                data: {
                    user_id: freshTrade.buyer_id,
                    message: `Inspection period expired for Trade #${tradeId}. Funds have been automatically released to the seller.`,
                    type: 'system_alert',
                    reference_id: tradeId
                }
            });
        });
        console.log(`[AI Worker] Successfully auto-released Trade ID ${tradeId}`);
    } catch (error) {
        console.error(`[AI Worker] Error processing auto-release for Trade ID ${tradeId}:`, error);
        throw error;
    }
}

// ==========================================
// CRYPTO-SHREDDER HANDLER
// ==========================================
export async function processCryptoShredder(data: { tradeId: number }) {
    const { tradeId } = data;
    console.log(`[AI Worker] Executing Crypto-Shredding for Trade ID ${tradeId}`);
    try {
        await prisma.transaction.update({
            where: { transaction_id: tradeId },
            data: { account_credentials: null }
        });
        console.log(`[AI Worker] Successfully shredded credentials for Trade ID ${tradeId}`);
    } catch (e) {
        console.error(`[AI Worker] Crypto-shredding failed for Trade ID ${tradeId}:`, e);
    }
}

// ==========================================
// BULLMQ WORKER INITIALIZATION (#1)
// ==========================================
const isDev = process.env.NODE_ENV !== 'production';
const USE_FALLBACK = isDev ? process.env.KYC_QUEUE_FALLBACK !== 'false' : process.env.KYC_QUEUE_FALLBACK === 'true';

if (!USE_FALLBACK) {
    const IORedis = require('ioredis');
    const connection = process.env.REDIS_URL 
        ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) 
        : { host: REDIS_HOST, port: REDIS_PORT };

    const worker = new Worker('kyc-processing', async job => {
        if (job.name === 'verify-kyc-phase2') await processKycPhase2(job.data);
        else if (job.name === 'verify-kyc-phase3') await processKycPhase3(job.data);
        else if (job.name === 'auto-release') await processAutoRelease(job.data);
        else if (job.name === 'crypto-shredder') await processCryptoShredder(job.data);
    }, {
        connection,
        concurrency: 2,
    });

    worker.on('failed', async (job, err) => {
        console.error(`[BullMQ] Job ${job?.name} failed after ${job?.attemptsMade} attempts:`, err.message);
        if (job?.data?.kycId) {
            try {
                await prisma.kycVerification.update({
                    where: { kyc_id: job.data.kycId },
                    data: {
                        status: 'rejected',
                        rejection_reason: `Processing failed after ${job.attemptsMade} attempts. Please resubmit your documents.`
                    }
                });
            } catch (e) {
                console.error('[BullMQ] Failed to update KYC status on job failure:', e);
            }
        }
    });

    worker.on('completed', (job) => {
        console.log(`[BullMQ] Job ${job.name} completed successfully.`);
    });

    console.log('[BullMQ] Worker initialized and listening to kyc-processing queue');
}
