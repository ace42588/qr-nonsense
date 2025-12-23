/**
 * Domain API Contracts: Input Management System
 * 
 * This file documents the public interfaces for input parsing and domain logic.
 * These contracts define how the domain layer processes inputs.
 * 
 * Date: 2025-01-27
 * Feature: Input Management System
 */

/**
 * parseAll Function
 * 
 * Parses all inputs in order, handling MAC dependencies correctly.
 * 
 * Signature:
 * ```typescript
 * function parseAll(inputs: Input[]): Record<string, ParsedInput>
 * ```
 * 
 * Behavior:
 * - Parses non-MAC inputs first
 * - Then parses MAC inputs with resolved dependencies
 * - Returns map of input ID → ParsedInput
 * - Throws error if parser not found for input type
 * 
 * Usage:
 * ```typescript
 * const parsed = parseAll(inputs);
 * const input1Parsed = parsed[input1.id];
 * ```
 * 
 * Performance:
 * - Should complete in <200ms for 10 inputs (SC-003)
 */
export interface ParseAllFunction {
  (inputs: Input[]): Record<string, ParsedInput>;
}

/**
 * Input Parser Interface
 * 
 * All input parsers must implement this interface.
 * 
 * Signature:
 * ```typescript
 * function parser(input: Input, context?: ParseContext): ParsedInput
 * ```
 * 
 * Parameters:
 * - input: Input - Input to parse
 * - context?: ParseContext - Optional context (e.g., parsed inputs for MAC)
 * 
 * Returns:
 * - ParsedInput - Parsed result with encoded data
 * 
 * Errors:
 * - Should return ParsedInput with error field if parsing fails
 * - Should not throw exceptions (errors returned in result)
 */
export interface InputParser {
  (input: Input, context?: ParseContext): ParsedInput;
}

/**
 * ParseContext
 * 
 * Context passed to parsers (e.g., for MAC input dependency resolution).
 */
export interface ParseContext {
  parsedInputs?: Record<string, ParsedInput>;
  inputs?: Input[];
}

/**
 * ParsedInput Type
 * 
 * Result of parsing an input.
 */
export interface ParsedInput {
  mode: "numeric" | "alphanumeric" | "byte" | "kanji";
  data: number[];
  length: number; // Length in bits
  error?: string; // Error message if parsing failed
}

/**
 * Parser Registry
 * 
 * Map of input type/mode to parser function.
 * 
 * Supported types:
 * - "string" | "byte" | "alphanumeric" | "numeric" → parseBasic
 * - "json" → parseJson
 * - "bitfield" → parseBitField
 * - "mac" → generateMAC
 */
export interface ParserRegistry {
  [key: string]: InputParser;
}

/**
 * createInput Function
 * 
 * Factory function for creating new input instances.
 * 
 * Signature:
 * ```typescript
 * function createInput(options?: InputOptions): Input
 * ```
 * 
 * Parameters:
 * - options?: InputOptions - Optional input configuration
 *   - type?: "string" | "json" | "bitfield" | "mac" - Input type (default: "string")
 *   - label?: string - Input label (default: "New Input")
 *   - id?: string - Input ID (default: generated UUID)
 *   - ...type-specific fields
 * 
 * Returns:
 * - Input - New input instance with defaults applied
 * 
 * Usage:
 * ```typescript
 * const input = createInput({ type: "json", label: "My JSON" });
 * ```
 */
export interface CreateInputFunction {
  (options?: InputOptions): Input;
}

export interface InputOptions {
  type?: "string" | "json" | "bitfield" | "mac";
  label?: string;
  id?: string;
  [key: string]: any; // Type-specific fields
}

/**
 * MAC Algorithm Interface
 * 
 * MAC algorithm functions must implement this interface.
 * 
 * Signature:
 * ```typescript
 * function macAlgorithm(data: Uint8Array, key: string): Uint8Array
 * ```
 * 
 * Parameters:
 * - data: Uint8Array - Data to authenticate
 * - key: string - Cryptographic key
 * 
 * Returns:
 * - Uint8Array - MAC value
 * 
 * Performance:
 * - Should complete in <1s for data up to 10KB (SC-006)
 */
export interface MacAlgorithm {
  (data: Uint8Array, key: string): Uint8Array;
}

/**
 * MAC Functions Registry
 * 
 * Map of algorithm name to MAC function.
 * 
 * Available algorithms:
 * - "Poly1305" - Poly1305 MAC
 * - "HMAC-SHA256" - HMAC with SHA-256
 * - ... (extensible)
 */
export interface MacFunctionsRegistry {
  [algorithmName: string]: MacAlgorithm;
}

/**
 * Encoding Strategy Interface
 * 
 * Custom encoding strategies (ModHex, NTRUPrime) must implement this.
 * 
 * Signature:
 * ```typescript
 * function encoder(data: Uint8Array): string
 * ```
 * 
 * Parameters:
 * - data: Uint8Array - Binary data to encode
 * 
 * Returns:
 * - string - Encoded string (ModHex: alphanumeric chars, NTRUPrime: decimal digits)
 */
export interface EncodingStrategy {
  (data: Uint8Array): string;
}

/**
 * Predefined Schemas
 * 
 * Available predefined serialization schemas.
 */
export interface PredefinedSchemas {
  bitSchema: any;
  jsonSchema: any;
  alphaNumericSchema: any;
}

// Re-export types
import type { Input, Field } from "@/types";

