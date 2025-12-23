import { Segment } from "../../shared/types";
import { Input } from "@/app/types";

interface EncodingOptions {
  [key: string]: any;
}

export function encodeAll(parsedInputs: Input[]): [Segment[], number];
export function finalizeEncoding(segments: Segment[], numDataCodewords: number): Segment[]; 