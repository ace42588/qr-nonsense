/**
 * Typed error for QR segment encoding failures.
 * Callers in the derived-data path must catch this so React render cannot crash.
 */
export class QREncodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QREncodeError";
  }
}
