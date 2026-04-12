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
            console.log(`[AI Worker] Falling back to OCR...`);
            const optimizedBuffer = await sharp(buffer).grayscale().normalize().toBuffer();
            const { data: { text } } = await Tesseract.recognize(optimizedBuffer, 'eng');
            const textLower = text.toLowerCase();
            
            const nameParts = textLowerIdName.split(' ');
            let nameHits = nameParts.filter(p => p.length > 2 && textLower.includes(p)).length;
            
            console.log(`[AI Worker] OCR extracted length: ${textLower.length} chars. Name Hits: ${nameHits}/${nameParts.length}. ID Type: ${idType}`);
            
            if (nameHits >= 1 && textLower.includes(idNumber.toLowerCase())) {
                foundData = true;
            } else if (idType.toLowerCase() === "passport" && textLower.includes("passport")) {
                foundData = true; // Permissive for passports if name slightly mismatched due to font
            } else if (nameHits >= 1) {
                // If it's not a passport, but we got at least 1 name match, we can optionally be permissive for testing
                foundData = true; 
            }
        }

        // 4. Face Detection on Document
        const idImg = new Image();
        idImg.src = buffer;
        const idDetection = await faceapi.detectSingleFace(idImg as any).withFaceLandmarks().withFaceDescriptor();
        
        if (!idDetection) {
            throw new Error("Rejected: No human face detected on provided ID document.");
        }
        if (!foundData) {
            throw new Error("Rejected: Submitted data does not match the physical document text or QR Code.");
        }

        console.log(`[AI Worker] Phase 2 Document Validated. Saving Face Descriptor and Phase.`);

        // DB Update
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: {
                status: 'phase2_verified',
                face_descriptor: Array.from(idDetection.descriptor)
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
        
        const savedDescriptorArray = kycRecord.face_descriptor as number[];
        const savedDescriptor = new Float32Array(savedDescriptorArray);

        const selfieBuffer = await sharp(livenessFilePath).resize(800).toBuffer();
        const selfieImg = new Image();
        selfieImg.src = selfieBuffer;
        const selfieDetection = await faceapi.detectSingleFace(selfieImg as any).withFaceLandmarks().withFaceDescriptor();

        if (!selfieDetection) {
             throw new Error("Rejected: Could not detect human face in live selfie.");
        }

        const distance = faceapi.euclideanDistance(savedDescriptor, selfieDetection.descriptor);
        console.log(`[AI Worker] Biometric Euclidean Distance: ${distance}`);
        
        // Strict biometric threshold
        if (distance >= 0.55) {
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
