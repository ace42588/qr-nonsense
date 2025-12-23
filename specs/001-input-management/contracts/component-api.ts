/**
 * Component API Contracts: Input Management System
 * 
 * This file documents the public interfaces for input management components
 * and hooks. These contracts define how components interact with the input
 * management system.
 * 
 * Date: 2025-01-27
 * Feature: Input Management System
 */

/**
 * InputProvider Component
 * 
 * Provides input state context to child components.
 * 
 * Props:
 * - children: ReactNode - Child components that need access to input state
 * 
 * Usage:
 * ```tsx
 * <InputProvider>
 *   <App />
 * </InputProvider>
 * ```
 */
export interface InputProviderProps {
  children: React.ReactNode;
}

/**
 * useInputs Hook
 * 
 * Returns the current input state and dispatch function.
 * 
 * Returns:
 * - state: InputState - Current input state
 * - dispatch: Dispatch<InputAction> - Function to dispatch input actions
 * 
 * Usage:
 * ```tsx
 * const { state, dispatch } = useInputs();
 * dispatch(addInput("New Input"));
 * ```
 */
export interface UseInputsReturn {
  state: InputState;
  dispatch: React.Dispatch<InputAction>;
}

/**
 * useParsedInputs Hook
 * 
 * Returns parsed inputs ready for QR code generation.
 * Automatically recalculates when inputs change.
 * 
 * Returns:
 * - ParsedInput[] - Array of parsed inputs in order
 * 
 * Usage:
 * ```tsx
 * const parsedInputs = useParsedInputs();
 * // Use parsedInputs for QR code generation
 * ```
 */
export interface UseParsedInputsReturn {
  parsedInputs: ParsedInput[];
  errors: InputError[];
}

/**
 * InputCard Component
 * 
 * Base component for displaying and editing an input.
 * 
 * Props:
 * - input: Input - Input to display/edit
 * - isActive: boolean - Whether this input is currently active
 * - onActivate: () => void - Callback when input is activated
 * - onUpdate: (partial: Partial<Input>) => void - Callback when input is updated
 * - onDelete: () => void - Callback when input is deleted
 * 
 * Usage:
 * ```tsx
 * <InputCard
 *   input={input}
 *   isActive={input.id === activeId}
 *   onActivate={() => dispatch(setActiveInput(input.id))}
 *   onUpdate={(partial) => dispatch(updateInput(input.id, partial))}
 *   onDelete={() => dispatch(removeInput(input.id))}
 * />
 * ```
 */
export interface InputCardProps {
  input: Input;
  isActive: boolean;
  onActivate: () => void;
  onUpdate: (partial: Partial<Input>) => void;
  onDelete: () => void;
}

/**
 * InputSidebar Component
 * 
 * Displays list of inputs with drag-and-drop reordering.
 * 
 * Props:
 * - inputs: Input[] - Array of inputs to display
 * - activeInputID: string - ID of currently active input
 * - onReorder: (oldIndex: number, newIndex: number) => void - Callback for reordering
 * - onAdd: () => void - Callback to add new input
 * - onSelect: (id: string) => void - Callback to select input
 * 
 * Usage:
 * ```tsx
 * <InputSidebar
 *   inputs={state.inputs}
 *   activeInputID={state.activeInputID}
 *   onReorder={(oldIdx, newIdx) => dispatch(reorderInput(oldIdx, newIdx))}
 *   onAdd={() => dispatch(addInput("New Input"))}
 *   onSelect={(id) => dispatch(setActiveInput(id))}
 * />
 * ```
 */
export interface InputSidebarProps {
  inputs: Input[];
  activeInputID: string;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onAdd: () => void;
  onSelect: (id: string) => void;
}

/**
 * StringInputCard Component
 * 
 * Specialized input card for string inputs with mode selection.
 * 
 * Props:
 * - Extends InputCardProps
 * - input: Input (type: "string") - String input
 * - onModeChange: (mode: string) => void - Callback when mode changes
 * - onTextChange: (text: string) => void - Callback when text changes
 */
export interface StringInputCardProps extends InputCardProps {
  input: Input & { type: "string" };
  onModeChange: (mode: "numeric" | "alphanumeric" | "byte" | "eci") => void;
  onTextChange: (text: string) => void;
}

/**
 * JsonInputCard Component
 * 
 * Specialized input card for JSON inputs with schema and encoding selection.
 * 
 * Props:
 * - Extends InputCardProps
 * - input: Input & { type: "json" } - JSON input
 * - onJsonChange: (obj: any) => void - Callback when JSON changes
 * - onSchemaChange: (schema: any) => void - Callback when schema changes
 * - onEncodingChange: (encoding: string) => void - Callback when encoding changes
 */
export interface JsonInputCardProps extends InputCardProps {
  input: Input & { type: "json" };
  onJsonChange: (obj: any) => void;
  onSchemaChange: (schema: any) => void;
  onEncodingChange: (encoding: string) => void;
}

/**
 * BitFieldInputCard Component
 * 
 * Specialized input card for BitField inputs with field management.
 * 
 * Props:
 * - Extends InputCardProps
 * - input: Input & { type: "bitfield" } - BitField input
 * - onFieldAdd: (field: Partial<Field>) => void - Callback to add field
 * - onFieldUpdate: (fieldId: string, updates: Partial<Field>) => void - Callback to update field
 * - onFieldDelete: (fieldId: string) => void - Callback to delete field
 * - onFieldReorder: (oldIndex: number, newIndex: number) => void - Callback to reorder fields
 * - onValuesChange: (values: Record<string, any>) => void - Callback when field values change
 */
export interface BitFieldInputCardProps extends InputCardProps {
  input: Input & { type: "bitfield" };
  onFieldAdd: (field: Partial<Field>) => void;
  onFieldUpdate: (fieldId: string, updates: Partial<Field>) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldReorder: (oldIndex: number, newIndex: number) => void;
  onValuesChange: (values: Record<string, any>) => void;
}

/**
 * MacInputCard Component
 * 
 * Specialized input card for MAC inputs with source selection and algorithm choice.
 * 
 * Props:
 * - Extends InputCardProps
 * - input: Input & { type: "mac" } - MAC input
 * - availableInputs: Input[] - Inputs available for MAC calculation
 * - onAlgorithmChange: (algo: string) => void - Callback when algorithm changes
 * - onKeyChange: (key: string) => void - Callback when key changes
 * - onSourcesChange: (inputIds: string[]) => void - Callback when source inputs change
 */
export interface MacInputCardProps extends InputCardProps {
  input: Input & { type: "mac" };
  availableInputs: Input[];
  onAlgorithmChange: (algo: string) => void;
  onKeyChange: (key: string) => void;
  onSourcesChange: (inputIds: string[]) => void;
}

/**
 * Error Types
 */
export interface InputError {
  inputId: string;
  message: string;
  field?: string; // Field name if error is field-specific
}

/**
 * ParsedInput Type
 * 
 * Result of parsing an input, ready for QR code generation.
 */
export interface ParsedInput {
  inputId: string;
  mode: "numeric" | "alphanumeric" | "byte" | "kanji";
  data: number[];
  length: number; // Length in bits
  error?: string; // Error message if parsing failed
}

// Re-export types from domain
import type { Input, InputState, InputAction, Field } from "../../../src/types/index";

