# KYC Pipeline Directive (Midly)

**Goal**: Accurately verify the identity of Midly users to comply with AML laws and prevent fraud.

## The 3-Phase Pipeline
The KYC system is divided into three distinct phases. Each phase MUST complete successfully before the next unlocks. Phase gates are enforced server-side.

### Phase 1: Identity Data
- Validate all user inputs with Zod before touching the database.
- **Encryption**: Encrypt `id_number` and `id_name` with AES-256-GCM before saving to the database.
- **Uniqueness Check**: Calculate the SHA-256 hash of the raw ID number to check for duplicates before saving. A stolen ID must not verify two separate accounts.
- **Initialization**: The server MUST crash on boot if `ENCRYPTION_KEY` is missing. No fallback key is permitted.

### Phase 2: Document Verification (BullMQ Job)
- **Face Extraction**: Use `detectAllFaces()`, sort by bounding box area, and take the largest face to ignore ghost photos/holograms.
- **OCR Engine**: Tesseract MUST run with `eng+fil` language packs.
- **Data Cleaning**: Preserve `ñ` and `Ñ` in the OCR cleaner (`text.replace(/[^a-zA-Z0-9\sñÑ]/g, ' ')`).
- **Quality Check**: Reject images with luminance < 30 or > 220, or dimensions under 800×500px.
- **Storage**: Store the face descriptor as a `Float[]`. Do NOT store as JSON objects.

### Phase 3: Liveness & Biometric Match
- **Liveness Requirements**: A minimum of 3 webcam frames is required. A single screenshot is an automatic fail.
- **Signals**: Monitor Eye Aspect Ratio variance (blink detection) and nose-tip X-offset variance (head movement).
- **Virtual Camera Guard**: Reject if any video input device label contains `virtual`, `obs`, `manycam`, `splitcam`, or `loopback`.
- **Biometric Thresholds**: 
  - `< kyc_review_threshold (0.45)`: Auto-verified ✅
  - `0.45 – 0.55`: `pending_review` (admin queue) ⚠️
  - `≥ kyc_biometric_threshold (0.55)`: Rejected ❌

## Status Terminology
- The database stores `'verified'`, NOT `'approved'`.
- Any frontend comparison using `kyc?.status === 'approved'` is inherently incorrect and will block verified users.

## Queue Modes
- `USE_FALLBACK = !process.env.REDIS_URL`
- Fallback mode runs AI synchronously and blocks the event loop. It is acceptable in development but MUST NOT be used in production.
