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
import { PrismaClient } from '@prisma/client';
import { decrypt } from './cryptoUtils';

const prisma = new PrismaClient();
const MODEL_DIR = path.join(process.cwd(), 'models');
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

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
        modelsLoaded = true;
        console.log('[AI Worker] FaceAPI Models loaded (pure JS backend).');
    } catch (e) {
        console.error("[AI Worker] Failed to load FaceAPI models:", e);
    }
}

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

export async function processKycPhase2(jobData: any) {
    const { kycId, filePath, idType, idNumberEncrypted, idNameEncrypted, birthdate } = jobData;
    console.log(`[AI Worker] Phase 2 processing for KYC ID: ${kycId}`);

    try {
        await loadModels();

        // 1. Prepare Image
        const buffer = await sharp(filePath).resize(1200).toBuffer();
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
            const nameParts = textLowerIdName.split(' ');
            let nameHits = nameParts.filter(p => p.length > 2 && qrText.includes(p)).length;
            
            if (nameHits >= 1 || qrText.includes(idNumber.toLowerCase())) {
                foundData = true;
                console.log(`[AI Worker] QR Code strongly validated Identity.`);
            }
        }

        // 3. OCR (Fallback Priority)
        if (!foundData) {
            console.log(`[AI Worker] Falling back to OCR... strictly evaluating text matrices.`);
            const optimizedBuffer = await sharp(buffer).grayscale().normalize().toBuffer();
            const { data: { text } } = await Tesseract.recognize(optimizedBuffer, 'eng');
            
            // Clean text by replacing non-alphanumeric (except spaces) with spaces, and normalizing whitespace
            const cleanText = text.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
            const rawWords = cleanText.split(' ').map(w => w.toLowerCase());
            
            const nameParts = textLowerIdName.split(' ');
            let nameHits = 0;
            
            // Strict Levenshtein based Word Matching (Looking for 85% similarity on Names)
            for (const part of nameParts) {
                if (part.length < 3) continue; // Skip very short initials
                let matched = false;
                for (const word of rawWords) {
                    if (word.length >= 3 && stringSimilarity(word, part) > 0.85) {
                        matched = true;
                        break;
                    }
                }
                if (matched) nameHits++;
            }
            
            // Exact ID Match using Regex Boundary (Ensures no substring false-positives)
            const idEscaped = idNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Sanitize
            const exactIdRegex = new RegExp(`\\b${idEscaped}\\b`, 'i');
            const hasExactIdMatch = exactIdRegex.test(cleanText) || rawWords.includes(idNumber.toLowerCase());

            console.log(`[AI Worker] OCR Exact ID Match: ${hasExactIdMatch}, Name Hits: ${nameHits}/${nameParts.length}`);
            
            if (hasExactIdMatch || nameHits >= 2) {
                // Fintech Standard: Either we precisely extract their ID number, OR we heavily match at least 2 parts of their name (First + Last)
                foundData = true;
                console.log(`[AI Worker] Strict Validation Passed on OCR.`);
            }
        }

        // 4. Face Detection on Document
        const idImg = new Image();
        idImg.src = buffer;
        
        // Lower confidence to handle glare/print, extract ALL faces to handle ghost holograms
        const detectOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 });
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
            throw new Error("Rejected: Submitted data does not match the physical document text or QR Code.");
        }

        console.log(`[AI Worker] Phase 2 Document Validated. Saving Face Descriptor and Phase.`);

        // DB Update
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: {
                status: 'phase2_verified',
                face_descriptor: Array.from(idDetection.descriptor) as any
            }
        });

    } catch (error: any) {
        console.error(`[AI Worker] Error Phase 2 for KYC ${kycId}:`, error);
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: { status: 'rejected', rejection_reason: error.message || 'Unknown processing error.' }
        });
    }
}

export async function processKycPhase3(jobData: any) {
    const { kycId, livenessFilePath } = jobData;
    console.log(`[AI Worker] Phase 3 Liveness Matrix processing for KYC ID: ${kycId}`);

    try {
        await loadModels();

        const kycRecord = await prisma.kycVerification.findUnique({ where: { kyc_id: kycId } });
        if (!kycRecord || !kycRecord.face_descriptor) {
             throw new Error("Missing Phase 2 document record.");
        }
        
        // Safely extract the DB Json payload to avoid JSON Object collapse into Float32Array
        const dbData = kycRecord.face_descriptor as any;
        let descriptorValues: number[] = [];
        
        if (Array.isArray(dbData)) {
             descriptorValues = dbData;
        } else if (dbData && typeof dbData === 'object') {
             // Prisma sometimes serializes plain arrays into { "0": -0.04, "1": 0.05 }
             descriptorValues = Object.values(dbData);
        }

        if (!descriptorValues || descriptorValues.length !== 128) {
             throw new Error("Rejected: Corrupted biometric baseline descriptor stored in Database.");
        }

        const savedDescriptor = new Float32Array(descriptorValues);

        const selfieBuffer = await sharp(livenessFilePath).resize(800).toBuffer();
        const selfieImg = new Image();
        selfieImg.src = selfieBuffer;
        const selfieDetection = await faceapi.detectSingleFace(selfieImg as any).withFaceLandmarks().withFaceDescriptor();

        if (!selfieDetection) {
             throw new Error("Rejected: Could not detect human face in live selfie.");
        }

        const distance = faceapi.euclideanDistance(savedDescriptor, selfieDetection.descriptor);
        console.log(`[AI Worker] Biometric Euclidean Distance: ${distance}`);
        
        // Strict biometric threshold WITH NaN guard
        if (isNaN(distance) || distance >= 0.55 || distance <= 0) {
             throw new Error("Rejected: Live selfie does not strictly match the provided ID document.");
        }

        console.log(`[AI Worker] KYC Fully Verified! Match Distance: ${distance}`);

        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: { status: 'verified', rejection_reason: null }
        });

        // Clean up selfie file
        fs.unlink(livenessFilePath, (err: any) => { if (err) console.error("Error removing selfie:", err); });

    } catch (error: any) {
        console.error(`[AI Worker] Fatal Error Phase 3 for KYC ${kycId}:`, error);
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: { status: 'rejected', rejection_reason: error.message || 'Unknown verification error' }
        });
    }
}

// Initialize BullMQ worker if not falling back
const USE_FALLBACK = true;
if (!USE_FALLBACK) {
    new Worker('kyc-processing', async job => {
        if (job.name === 'verify-kyc-phase2') await processKycPhase2(job.data);
        else if (job.name === 'verify-kyc-phase3') await processKycPhase3(job.data);
    }, {
        connection: { host: REDIS_HOST, port: REDIS_PORT }
    });
    console.log('[BullMQ] Worker initialized and listening to kyc-processing queue');
}
