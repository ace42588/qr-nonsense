import { Segment, Input } from "@/types/index";

interface EncodingOptions {
  [key: string]: any;
}

export function encodeAll(parsedInputs: Input[]): [Segment[], number];
export function finalizeEncoding(segments: Segment[], numDataCodewords: number): Segment[]; 