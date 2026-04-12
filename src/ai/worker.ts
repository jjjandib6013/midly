import { Worker } from 'bullmq';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
// We use the nodejs env for face-api
import * as canvas from 'canvas';
import * as faceapi from '@vladmandic/face-api';
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
(faceapi.env as any).monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;
async function loadModels() {
    if (modelsLoaded) return;
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_DIR);
        modelsLoaded = true;
        console.log('FaceAPI Models loaded natively.');
    } catch (e) {
        console.error("Failed to load FaceAPI models:", e);
    }
}

export async function processKycJob(jobData: any) {
    const { kycId, filePath, livenessFilePath, idNumberEncrypted, idNameEncrypted } = jobData;
    console.log(`[AI Worker] Beginning processing for KYC ID: ${kycId}`);

    try {
        if (!modelsLoaded) {
            await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_DIR);
            await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_DIR);
            await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_DIR);
            modelsLoaded = true;
            console.log('FaceAPI Models loaded natively.');
        }

        // 1. Optimize ID Image via Sharp
        const optimizedBuffer = await sharp(filePath).resize(800).grayscale().toBuffer();
        console.log(`[AI Worker] Image optimized via Sharp.`);

        // 2. Text Verification (OCR)
        const { data: { text } } = await Tesseract.recognize(optimizedBuffer, 'eng', { logger: m => { } });
        const textLower = text.toLowerCase();

        const idNumber = decrypt(idNumberEncrypted);
        const idName = decrypt(idNameEncrypted);

        // Heuristics: Check Name/Number
        const nameParts = idName.toLowerCase().split(' ');
        let nameFound = false;
        for (const p of nameParts) {
            if (p.length > 2 && textLower.includes(p)) {
                nameFound = true; break;
            }
        }
        const numberFound = textLower.includes(idNumber.toLowerCase());
        console.log(`[AI Worker] Heuristics - Name Found: ${nameFound}, Number Found: ${numberFound}`);

        // 3. Face Detection & Descriptors on ID
        const idImg = new Image();
        idImg.src = optimizedBuffer;
        const idDetection = await faceapi.detectSingleFace(idImg as any).withFaceLandmarks().withFaceDescriptor();
        const faceFoundOnId = !!idDetection;

        // 4. Face Detection & Descriptors on Selfie (Liveness Check)
        let faceFoundOnSelfie = false;
        let biometricMatch = false;

        if (livenessFilePath) {
            const selfieBuffer = await sharp(livenessFilePath).resize(800).toBuffer();
            const selfieImg = new Image();
            selfieImg.src = selfieBuffer;
            const selfieDetection = await faceapi.detectSingleFace(selfieImg as any).withFaceLandmarks().withFaceDescriptor();

            if (selfieDetection) {
                faceFoundOnSelfie = true;
                if (idDetection) {
                    const distance = faceapi.euclideanDistance(idDetection.descriptor, selfieDetection.descriptor);
                    console.log(`[AI Worker] Biometric Euclidean Distance: ${distance}`);
                    // Distance < 0.6 is a standard threshold for FaceAPI match
                    if (distance < 0.6) biometricMatch = true;
                }
            }
        }

        console.log(`[AI Worker] Face Processing - ID: ${faceFoundOnId}, Selfie: ${faceFoundOnSelfie}, BiometricMatch: ${biometricMatch}`);

        // 5. Resolution Logic
        let status = 'rejected';
        let reason = 'AI Verification Failed';

        if (faceFoundOnId && faceFoundOnSelfie && biometricMatch && (nameFound || numberFound)) {
            status = 'verified';
            reason = 'Algorithmically Verified: Liveness Match + Textual Match';
        } else if (!faceFoundOnSelfie) {
            reason = 'Rejected: Could not detect human face in live selfie.';
        } else if (!biometricMatch) {
            reason = 'Rejected: Live selfie does not match the provided ID document.';
        } else if (!faceFoundOnId) {
            reason = 'Rejected: No human face detected on provided ID document.';
        } else {
            reason = 'Rejected: Submitted data does not visibly match the physical document text.';
        }

        console.log(`[AI Worker] KYC Result: ${status}. Reason: ${reason}`);

        // Save Descriptor array as JSON into the database for future verification purposes
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: {
                status,
                face_descriptor: idDetection ? Array.from(idDetection.descriptor) : null
            }
        });

        // Clean up selfie file
        if (livenessFilePath) {
            fs.unlink(livenessFilePath, (err: any) => { if (err) console.error("Error removing selfie:", err); });
        }

        return { status, reason };

    } catch (error) {
        console.error(`[AI Worker] Fatal Error processing KYC ${kycId}:`, error);
        await prisma.kycVerification.update({
            where: { kyc_id: kycId },
            data: { status: 'rejected' }
        });
        throw error;
    }
}

// Initialize BullMQ worker if not falling back
const USE_FALLBACK = true;
if (!USE_FALLBACK) {
    new Worker('kyc-processing', async job => {
        await processKycJob(job.data);
    }, {
        connection: { host: REDIS_HOST, port: REDIS_PORT }
    });
    console.log('[BullMQ] Worker initialized and listening to kyc-processing queue');
}
