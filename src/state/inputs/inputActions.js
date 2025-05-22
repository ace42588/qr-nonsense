// src/state/inputs/inputActions.js
export const Actions = {
  Add: "ADD",
  Remove: "REMOVE",
  Update: "UPDATE",
  Reorder: "REORDER",
  SetInputType: "SET_INPUT_TYPE",
  SetErrorCorrectionLevel: "SET_EC_LEVEL",
  SetVersion: "SET_VERSION",
  SetDataMask: "SET_DATA_MASK",
  SetInputs: "SET_INPUTS",
  SetSchemaName: "SET_SCHEMA_NAME",
  UpdateSchema: "UPDATE_SERIALIZATION_SCHEMA",
  UpdateEncoding: "UPDATE_ENCODING_STRATEGY",
  SetActiveInput: "SET_ACTIVE_INPUT",
  AddBitFieldField: "ADD_BITFIELD_FIELD",
  RemoveBitFieldField: "REMOVE_BITFIELD_FIELD",
  UpdateBitFieldField: "UPDATE_BITFIELD_FIELD",
  ReorderBitFieldFields: "REORDER_BITFIELD_FIELDS",
  SetBitFieldValues: "SET_BITFIELD_VALUES",
  UpdateJsonObject: "UPDATE_JSON_OBJ",
  SetMacKey: "SET_MAC_KEY",
  SetMacAlgorithm: "SET_MAC_ALGO",
  SetIncludedFields: "SET_INCLUDED_FIELDS",
};

export const addInput = (label) => ({ type: Actions.Add, payload: { label } });
export const removeInput = (id) => ({ type: Actions.Remove, payload: { id } });
export const updateInput = (id, partial) => ({
  type: Actions.Update,
  payload: { id, partial },
});
export const updateEncoding = (id, encoding) => ({
  type: Actions.UpdateEncoding,
  payload: { id, encoding },
});
export const updateSchema = (id, schema) => ({
  type: Actions.UpdateSchema,
  payload: { id, schema },
});
export const setSchemaName = (id, name) => ({
  type: Actions.SetSchemaName,
  payload: { id, name },
});
export const reorderInputs = (oldIndex, newIndex) => ({
  type: Actions.Reorder,
  payload: { oldIndex, newIndex },
});
export const setInputType = (id, newType) => ({
  type: Actions.SetInputType,
  payload: { id, newType },
});
export const setErrorCorrectionLevel = (value) => ({
  type: Actions.SetErrorCorrectionLevel,
  payload: { field: "errorCorrectionLevel", value },
});
export const setVersion = (value) => ({
  type: Actions.SetVersion,
  payload: { field: "version", value },
});
export const setDataMask = (value) => ({
  type: Actions.SetDataMask,
  payload: { field: "dataMask", value },
});
export const setInputs = (payload) => ({ type: Actions.SetInputs, payload });

export const setActiveInput = (id) => ({
  type: Actions.SetActiveInput,
  payload: { id },
});
export const addBitFieldField = (id, newField) => ({
  type: Actions.AddBitFieldField,
  payload: { id, newField },
});

export const removeBitFieldField = (id, fieldId) => ({
  type: Actions.RemoveBitFieldField,
  payload: { id, fieldId },
});

export const updateBitFieldField = (id, fieldId, partial) => ({
  type: Actions.UpdateBitFieldField,
  payload: { id, fieldId, partial },
});

export const reorderBitFieldFields = (id, oldIndex, newIndex) => ({
  type: Actions.ReorderBitFieldFields,
  payload: { id, oldIndex, newIndex },
});

export const setBitFieldValues = (id, updatedValues) => ({
  type: Actions.SetBitFieldValues,
  payload: { id, updatedValues },
});

export const updateJsonObject = (id, obj) => ({
  type: Actions.UpdateJsonObject,
  payload: { id, obj },
});

export const setMacKey = (id, key) => ({
  type: Actions.SetMacKey,
  payload: { id, key },
});

export const setMacAlgorithm = (id, algo) => ({
  type: Actions.SetMacAlgorithm,
  payload: { id, algo },
});

export const setIncludedFields = (id, includedFields) => ({
  type: Actions.SetIncludedFields,
  payload: { id, includedFields },
});
