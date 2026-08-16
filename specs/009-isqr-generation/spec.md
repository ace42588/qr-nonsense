# Feature Specification: IS-QR Generation

**Feature Branch**: `009-isqr-generation`  
**Created**: 2026-08-15  
**Status**: Implemented  
**Input**: Browser IS-QR mode — instance-segmentation-style QR beautification with HVS (DWT + CSF) and image quality metrics

## User Scenarios & Testing

### User Story 1 - Generate IS-QR (Priority: P1)

As a user, I need to generate a full-color beautified QR code that preserves salient image instances so the code remains scannable and visually meaningful.

**Independent Test**: Upload an image, select IS-QR mode, verify a fused QR renders and decode rate is reported.

**Acceptance Scenarios**:

1. **Given** inputs and an uploaded image, **When** I select IS-QR, **Then** an IS-QR code is generated via ROI-aware QArt + color fusion + DWT/CSF
2. **Given** no image, **When** I select IS-QR, **Then** a warning indicates an image is required
3. **Given** generation completes, **When** I view metrics, **Then** MSE, PSNR, SSIM, FSIM, and GMSD are shown

### User Story 2 - Configure ROI and HVS (Priority: P2)

As a user, I need to tune ROI threshold, CSF strength, print DPI, viewing distance, and optional mask upload.

**Acceptance Scenarios**:

1. Adjusting ROI threshold regenerates the mask / code
2. Uploading a mask PNG overrides automatic saliency ROI
3. Show ROI overlays the instance mask on modules

## Non-Goals

- Real BlendMask / Detectron2 / ONNX model weights
- Server-side inference
- Paper-parity numerical comparison to Tsai & Peng baselines

## Technical Notes

- ROI approximates BlendMask via FT saliency → Otsu → morphology → connected components
- Codeword fusion reuses QArt Gauss–Jordan with `priorityFunction: "roi"`
- Domain modules live under `src/domain/isqr/`
