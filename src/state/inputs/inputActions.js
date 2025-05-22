// src/state/inputs/inputActions.js
export const Actions = {
  Add: "ADD",
  Remove: "REMOVE",
  Update: "UPDATE",
  Reorder: "REORDER",
  ChangeType: "CHANGE_TYPE",
  ChangeMeta: "CHANGE_META",
  SetInputs: "SET_INPUTS",
  SetSchemaName: "SET_SCHEMA_NAME",
  UpdateSchema: "UPDATE_SERIALIZATION_SCHEMA",
  UpdateEncoding: "UPDATE_ENCODING_STRATEGY",
  SetActiveInput: "SET_ACTIVE_INPUT",
};

export const addInput = (label) => ({ type: Actions.Add, payload: { label } });
export const removeInput = (id) => ({ type: Actions.Remove, payload: { id } });
export const updateInput = (id, partial) => ({ type: Actions.Update, payload: { id, partial } });
export const updateEncoding = (id, encoding) => ({ type: Actions.UpdateEncoding, payload: { id, encoding } });
export const updateSchema = (id, schema) => ({ type: Actions.UpdateSchema, payload: { id, schema } });
export const setSchemaName = (id, name) => ({ type: Actions.SetSchemaName, payload: { id, name } });
export const reorderInputs = (oldIndex, newIndex) => ({ type: Actions.Reorder, payload: { oldIndex, newIndex } });
export const changeType = (id, newType) => ({ type: Actions.ChangeType, payload: { id, newType } });
export const setMetaField = (field, value) => ({ type: Actions.ChangeMeta, payload: { field, value } });
export const setInputs = (payload) => ({ type: Actions.SetInputs, payload });
export const setActiveInput = (id) => ({ type: Actions.SetActiveInput, payload: { id } });
