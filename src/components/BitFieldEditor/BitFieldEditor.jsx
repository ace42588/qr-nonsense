import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

function bitsNeeded(max) {
  return max <= 0 ? 1 : Math.ceil(Math.log2(Number(max) + 1));
}

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

const DEFAULT_FIELD = { label: "", min: 0, max: 255 };

export default function BitFieldEditor({ fields, setFields }) {
  function handleAddField() {
    setFields([...fields, { ...DEFAULT_FIELD }]);
  }

  function handleChange(idx, key, value) {
    setFields(fields =>
      fields.map((f, i) =>
        i === idx ? { ...f, [key]: value } : f
      )
    );
  }

  function handleRemove(idx) {
    setFields(fields => fields.filter((_, i) => i !== idx));
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    setFields(reorder(fields, result.source.index, result.destination.index));
  }

  const totalBits = fields.reduce((sum, f) => sum + bitsNeeded(f.max), 0);

  return (
    <div style={{ marginBottom: 32 }}>
      <h2>Bit Field Editor</h2>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="bitfields">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} style={{ minHeight: 50 }}>
              {fields.map((field, idx) => {
                const bitCount = bitsNeeded(field.max);
                return (
                  <Draggable key={idx} draggableId={`field-${idx}`} index={idx}>
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 8,
                          background: "#f5f5fa",
                          borderRadius: 6,
                          padding: "8px",
                          ...prov.draggableProps.style,
                        }}
                      >
                        <span {...prov.dragHandleProps} style={{ cursor: "grab", marginRight: 8 }}>☰</span>
                        <input
                          type="text"
                          placeholder="Label"
                          value={field.label}
                          onChange={e => handleChange(idx, "label", e.target.value)}
                          style={{ width: 100, marginRight: 8 }}
                        />
                        <input
                          type="number"
                          value={field.min}
                          onChange={e => handleChange(idx, "min", Number(e.target.value))}
                          style={{ width: 60, marginRight: 8 }}
                        />
                        <input
                          type="number"
                          value={field.max}
                          onChange={e => handleChange(idx, "max", Number(e.target.value))}
                          style={{ width: 60 }}
                        />
                        <button
                          onClick={() => handleRemove(idx)}
                          style={{ marginLeft: 8, color: "red", background: "none", border: "none", cursor: "pointer" }}
                          title="Remove"
                        >✕</button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <button onClick={handleAddField} style={{ marginTop: 8 }}>
        + Add Field
      </button>
      <div style={{ marginTop: 8, color: "#888" }}>
        Total bits: <b>{totalBits}</b>
      </div>
    </div>
  );
}
