import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEncodedMessage, getCodewords } from "@/domain/qr";
import { getMatrix } from "@/domain/qr/matrix";
import type { Input } from "@/state/inputs/types";
import {
  createGenerationContext,
  runGraph,
  validateNodeSequence,
  PipelineError,
  PRESETS,
  listPresetIds,
  listNodeIds,
  NODE_CATALOG,
  isqrResultFromContext,
  generateQArtForFrames,
} from "@/domain/pipeline";
import type { QArtResult } from "@/domain/qart";

vi.mock("@/adapters/browser/validation", async () => {
  const actual = (await vi.importActual(
    "@/adapters/browser/validation"
  )) as object;
  return {
    ...actual,
    validateDecode: vi.fn().mockResolvedValue(1.0),
    createBrowserEvaluateDecodePort: () => ({
      decodeMatrixTrials: vi.fn().mockResolvedValue([
        { success: true, payload: "HI" },
      ]),
      decodeImageData: vi.fn().mockResolvedValue([
        { success: true, payload: "HI" },
      ]),
    }),
  };
});

function tinyImage(size = 32): ImageData {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 200;
    data[i + 1] = 200;
    data[i + 2] = 200;
    data[i + 3] = 255;
  }
  return { width: size, height: size, data } as ImageData;
}

function sampleInput(data = "HELLO"): Input {
  return {
    id: "t1",
    type: "string",
    mode: "byte",
    data,
  };
}

describe("pipeline catalog", () => {
  it("exposes expected node ids", () => {
    const ids = listNodeIds();
    expect(ids).toContain("encode");
    expect(ids).toContain("qartOptimize");
    expect(ids).toContain("halftone");
    expect(ids).toContain("encodePair");
    expect(ids).toContain("applyDamage");
    expect(NODE_CATALOG.encode.in).toEqual(["Inputs", "Format"]);
  });

  it("rejects illegal sequences before run", () => {
    expect(() =>
      validateNodeSequence(["halftone"], createGenerationContext())
    ).toThrow(PipelineError);

    expect(() =>
      validateNodeSequence(
        ["halftone"],
        createGenerationContext({
          targetImage: tinyImage(),
        })
      )
    ).toThrow(/missing required ports/);
  });

  it("lists all mode presets", () => {
    expect(listPresetIds().sort()).toEqual(
      [
        "ambiguous",
        "combined",
        "damage",
        "embed",
        "hqr",
        "isqr",
        "qart",
        "qr",
      ].sort()
    );
    expect(PRESETS.qr.nodes).toEqual([
      "parseInputs",
      "encode",
      "codewords",
      "matrix",
      "evaluate",
    ]);
    expect(listNodeIds()).toContain("evaluate");
  });
});

describe("qr preset", () => {
  it("matches classic encode → codewords → matrix", async () => {
    const input = sampleInput("A");
    const ecl = 0;
    const selectedVersion = -1;

    // Same node list as preset without parseInputs — compare encode core.
    const ctx = await runGraph(
      ["encode", "codewords", "matrix"],
      createGenerationContext({
        inputs: [input],
        version: selectedVersion,
        errorCorrectionLevel: ecl,
        dataMask: -1,
      })
    );

    const classic = getEncodedMessage([input], selectedVersion, ecl);
    const segmentsWithBitIds = classic.segments.map((s) => ({ ...s }));
    const { codewords } = getCodewords(
      segmentsWithBitIds,
      classic.version,
      ecl
    );
    const { matrix, dataMask } = getMatrix(
      codewords,
      -1,
      classic.version,
      ecl
    );

    expect(ctx.version).toBe(classic.version);
    expect(ctx.segments?.length).toBe(classic.segments.length);
    expect(ctx.codewords?.length).toBe(codewords.length);
    expect(ctx.matrix?.length).toBe(matrix.length);
    expect(ctx.dataMask).toBe(dataMask);

    // Bit identity: some segment bitIds appear on the matrix
    const bitIds = new Set(
      (ctx.segments ?? []).flatMap((s) => s.bitIds ?? [])
    );
    let matched = 0;
    for (let y = 0; y < (ctx.matrix?.length ?? 0); y++) {
      for (const m of ctx.matrix![y] ?? []) {
        if (m?.bit?.id && bitIds.has(m.bit.id)) matched++;
      }
    }
    expect(matched).toBeGreaterThan(0);
  });
});

describe("presets smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs qr / hqr / ambiguous / embed without throwing", async () => {
    const input = sampleInput("HI");
    const inputB = sampleInput("YO");
    const image = tinyImage(64);

    await expect(
      runGraph(
        "qr",
        createGenerationContext({
          inputs: [input],
          version: -1,
          errorCorrectionLevel: 0,
          dataMask: -1,
        })
      )
    ).resolves.toBeTruthy();

    await expect(
      runGraph(
        "hqr",
        createGenerationContext({
          inputs: [input],
          version: -1,
          errorCorrectionLevel: 0,
          dataMask: -1,
          targetImage: image,
        })
      )
    ).resolves.toMatchObject({ renderIntent: "halftone" });

    const amb = await runGraph(
      "ambiguous",
      createGenerationContext({
        inputs: [input],
        inputsB: [inputB],
        version: -1,
        errorCorrectionLevel: 0,
        dataMask: -1,
      })
    );
    expect(amb.matrixA).toBeTruthy();
    expect(amb.matrixB).toBeTruthy();
    expect(amb.ambiguousStats?.totalModules).toBeGreaterThan(0);

    const emb = await runGraph(
      "embed",
      createGenerationContext({
        inputs: [input],
        inputsB: [inputB],
        version: -1,
        errorCorrectionLevel: 0,
        dataMask: -1,
        modulePixel: 9,
        centerSeed: 0.35,
      })
    );
    expect(emb.fusedImage).toBeTruthy();
    expect(emb.renderIntent).toBe("embed");

    const isqr = await runGraph(
      "isqr",
      createGenerationContext({
        inputs: [sampleInput("A")],
        version: -1,
        errorCorrectionLevel: 0,
        dataMask: 0,
        targetImage: image,
        modulePixel: 3,
      })
    );
    expect(isqr.fusedImage).toBeTruthy();
    expect(isqr.roiGrid).toBeTruthy();
    expect(isqr.roiMeta).toBeTruthy();
    expect(isqr.renderIntent).toBe("isqr");
  });

  it("computes IS-QR metrics when evaluate deferred them", () => {
    const fused = tinyImage(21);
    const result = isqrResultFromContext(
      createGenerationContext({
        fusedImage: fused,
        targetImage: tinyImage(32),
        roiGrid: new Float32Array(21 * 21),
        roiMeta: {
          mask: new Float32Array(1),
          saliency: new Float32Array(1),
          labels: new Int32Array(1),
          instanceCount: 1,
          width: 1,
          height: 1,
        },
      }),
      {
        matrix: [],
        dataMask: 0,
        segments: [],
        error: 0,
        decodeSuccessRate: 1,
      } as QArtResult
    );
    expect(result.fusedImage).toBe(fused);
    expect(result.metrics.ssim).toBeGreaterThanOrEqual(0);
    expect(result.instanceCount).toBe(1);
  });

  it("runs qart preset with image and mocked decode", async () => {
    const input = sampleInput("A");
    const image = tinyImage(64);
    const ctx = await runGraph(
      "qart",
      createGenerationContext({
        inputs: [input],
        version: -1,
        errorCorrectionLevel: 0,
        dataMask: 0,
        targetImage: image,
        priorityFunction: "contrast",
      })
    );
    expect(ctx.matrix).toBeTruthy();
    expect(ctx.decodeSuccessRate).toBe(1);
    expect(ctx.controlMatrix).toBeTruthy();
    expect(ctx.evaluation).toBeTruthy();
    expect(ctx.evaluation?.structure?.penalty.total).toBeGreaterThanOrEqual(0);
  });

  it("attaches evaluation on qr preset", async () => {
    const input = sampleInput("HI");
    const ctx = await runGraph(
      "qr",
      createGenerationContext({
        inputs: [input],
        version: -1,
        errorCorrectionLevel: 0,
        dataMask: -1,
      })
    );
    expect(ctx.evaluation).toBeTruthy();
    expect(ctx.evaluation?.metrics.length).toBeGreaterThan(0);
  });

  it("rejects evaluate before matrix", () => {
    expect(() =>
      validateNodeSequence(["evaluate"], createGenerationContext())
    ).toThrow(/missing required ports/);
  });

  it("runs qartAppend once then generates independent frames", async () => {
    const encoded = await runGraph(
      ["encode", "codewords", "matrix"],
      createGenerationContext({
        inputs: [sampleInput("A")],
        version: -1,
        errorCorrectionLevel: 0,
        dataMask: 0,
      })
    );
    const appendSpy = vi.spyOn(NODE_CATALOG.qartAppend, "run");
    const dark = tinyImage(32);
    const light = tinyImage(32);
    light.data.fill(255);

    const results = await generateQArtForFrames(
      {
        segments: encoded.segments!,
        codewords: encoded.codewords!,
        blocks: encoded.blocks!,
        initialMatrix: encoded.matrix!,
        versionInfo: encoded.versionInfo!,
        errorCorrectionLevel: 0,
        targetImage: dark,
      },
      [
        { targetImage: dark },
        { targetImage: light },
      ]
    );

    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(2);
    expect(results[0].matrix).toBeTruthy();
    expect(results[1].matrix).toBeTruthy();
    expect(results[0].matrix).not.toBe(results[1].matrix);
    appendSpy.mockRestore();
  });

  it("cancels frame generation when the signal is aborted", async () => {
    const encoded = await runGraph(
      ["encode", "codewords", "matrix"],
      createGenerationContext({
        inputs: [sampleInput("A")],
        version: -1,
        errorCorrectionLevel: 0,
        dataMask: 0,
      })
    );
    const controller = new AbortController();
    controller.abort();
    await expect(
      generateQArtForFrames(
        {
          segments: encoded.segments!,
          codewords: encoded.codewords!,
          blocks: encoded.blocks!,
          initialMatrix: encoded.matrix!,
          versionInfo: encoded.versionInfo!,
          errorCorrectionLevel: 0,
          targetImage: tinyImage(32),
          signal: controller.signal,
        },
        [{ targetImage: tinyImage(32) }, { targetImage: tinyImage(32) }]
      )
    ).rejects.toThrow(/cancel/i);
  });
});
