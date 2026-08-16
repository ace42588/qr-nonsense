export enum Actions {
  Add = "ADD",
  Remove = "REMOVE",
  Update = "UPDATE",
  Reorder = "REORDER",
  SetInputType = "SET_INPUT_TYPE",
  SetErrorCorrectionLevel = "SET_EC_LEVEL",
  SetVersion = "SET_VERSION",
  SetDataMask = "SET_DATA_MASK",
  SetInputs = "SET_INPUTS",
  SetSchemaName = "SET_SCHEMA_NAME",
  UpdateSchema = "UPDATE_SERIALIZATION_SCHEMA",
  UpdateEncoding = "UPDATE_ENCODING_STRATEGY",
  SetActiveInput = "SET_ACTIVE_INPUT",
  AddBitFieldField = "ADD_BITFIELD_FIELD",
  RemoveBitFieldField = "REMOVE_BITFIELD_FIELD",
  UpdateBitFieldField = "UPDATE_BITFIELD_FIELD",
  ReorderBitFieldFields = "REORDER_BITFIELD_FIELDS",
  SetBitFieldValues = "SET_BITFIELD_VALUES",
  UpdateJsonObject = "UPDATE_JSON_OBJ",
  SetMacKey = "SET_MAC_KEY",
  SetMacAlgorithm = "SET_MAC_ALGO",
  SetIncludedFields = "SET_INCLUDED_FIELDS",
  SetActivePayload = "SET_ACTIVE_PAYLOAD",
}

export const addInput = (label: string) => ({ type: Actions.Add, payload: { label } });
export const removeInput = (id: string) => ({ type: Actions.Remove, payload: { id } });
export const updateInput = (id: string, partial: any) => ({
  type: Actions.Update,
  payload: { id, partial },
});
export const updateEncoding = (id: string, encoding: string) => ({
  type: Actions.UpdateEncoding,
  payload: { id, encoding },
});
export const updateSchema = (id: string, schema: any) => ({
  type: Actions.UpdateSchema,
  payload: { id, schema },
});
export const setSchemaName = (id: string, name: string) => ({
  type: Actions.SetSchemaName,
  payload: { id, name },
});
export const reorderInputs = (oldIndex: number, newIndex: number) => ({
  type: Actions.Reorder,
  payload: { oldIndex, newIndex },
});
export const setInputType = (id: string, newType: string) => ({
  type: Actions.SetInputType,
  payload: { id, newType },
});
export const setErrorCorrectionLevel = (value: number) => ({
  type: Actions.SetErrorCorrectionLevel,
  payload: { field: "errorCorrectionLevel", value },
});
export const setVersion = (value: number) => ({
  type: Actions.SetVersion,
  payload: { field: "version", value },
});
export const setDataMask = (value: number | null) => ({
  type: Actions.SetDataMask,
  payload: { field: "dataMask", value },
});
export const setInputs = (payload: any) => ({ type: Actions.SetInputs, payload });

export const setActiveInput = (id: string) => ({
  type: Actions.SetActiveInput,
  payload: { id },
});
export const addBitFieldField = (id: string, label: string) => ({
  type: Actions.AddBitFieldField,
  payload: { id, label },
});

export const removeBitFieldField = (id: string, fieldId: string) => ({
  type: Actions.RemoveBitFieldField,
  payload: { id, fieldId },
});

export const updateBitFieldField = (id: string, fieldId: string, partial: any) => ({
  type: Actions.UpdateBitFieldField,
  payload: { id, fieldId, partial },
});

export const reorderBitFieldFields = (id: string, oldIndex: number, newIndex: number) => ({
  type: Actions.ReorderBitFieldFields,
  payload: { id, oldIndex, newIndex },
});

export const setBitFieldValues = (id: string, updatedValues: any) => ({
  type: Actions.SetBitFieldValues,
  payload: { id, updatedValues },
});

export const updateJsonObject = (id: string, obj: any) => ({
  type: Actions.UpdateJsonObject,
  payload: { id, obj },
});

export const setMacKey = (id: string, key: string) => ({
  type: Actions.SetMacKey,
  payload: { id, key },
});

export const setMacAlgorithm = (id: string, algo: string) => ({
  type: Actions.SetMacAlgorithm,
  payload: { id, algo },
});

export const setIncludedFields = (id: string, includedFields: string[]) => ({
  type: Actions.SetIncludedFields,
  payload: { id, includedFields },
});

export const setActivePayload = (activePayload: "a" | "b") => ({
  type: Actions.SetActivePayload,
  payload: { activePayload },
}); 