import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// Helper to calculate required bits for max value
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

export default function BitFieldEditor({ onChange }) {
  const [fields, setFields] = useState([{ ...DEFAULT_FIELD }]);

  // Call this whenever fields change to notify parent
  React.useEffect(() => {
    if (onChange) onChange(fields);
  }, [fields, onChange]);

  function handleAddField() {
    setFields([...fields, { ...DEFAULT_FIELD }]);
  }

  function handleChange(idx, key, value) {
    setFields((fields) =>
      fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f))
    );
  }

  function handleRemove(idx) {
    setFields((fields) => fields.filter((_, i) => i !== idx));
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    setFields(reorder(fields, result.source.index, result.destination.index));
  }

  const totalBits = fields.reduce((sum, f) => sum + bitsNeeded(f.max), 0);

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "2rem auto",
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
      }}
    >
      <h2 style={{ marginBottom: 12 }}>Bit Field Editor</h2>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="bitfields">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: 50, // Add a minHeight so it exists even with 0 items
                display: "flex",
                flexDirection: "column",
              }}
            >
              {fields.map((field, idx) => {
                const bitCount = bitsNeeded(field.max);
                const widthPercent = (bitCount / Math.max(1, totalBits)) * 100;

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
                          boxShadow: "0 1px 3px #0001",
                          padding: "8px 8px 8px 0",
                          ...prov.draggableProps.style,
                        }}
                      >
                        <span
                          {...prov.dragHandleProps}
                          style={{
                            cursor: "grab",
                            marginRight: 8,
                            fontSize: 16,
                          }}
                        >
                          ☰
                        </span>
                        <input
                          type="text"
                          placeholder="Label"
                          value={field.label}
                          onChange={(e) =>
                            handleChange(idx, "label", e.target.value)
                          }
                          style={{ width: 80, marginRight: 8 }}
                        />
                        <input
                          type="number"
                          min="0"
                          value={field.min}
                          onChange={(e) =>
                            handleChange(idx, "min", Number(e.target.value))
                          }
                          style={{ width: 60, marginRight: 8 }}
                        />
                        <input
                          type="number"
                          min={field.min}
                          value={field.max}
                          onChange={(e) =>
                            handleChange(idx, "max", Number(e.target.value))
                          }
                          style={{ width: 60, marginRight: 8 }}
                        />
                        <div
                          title={`${bitCount} bits`}
                          style={{
                            flex: 1,
                            minWidth: 60,
                            marginLeft: 8,
                            background: "#ccc",
                            borderRadius: 4,
                            height: 18,
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              background: "#3b82f6",
                              height: "100%",
                              width: `${widthPercent}%`,
                              transition: "width 0.2s",
                            }}
                          />
                          <span
                            style={{
                              position: "absolute",
                              left: 6,
                              top: 0,
                              fontSize: 12,
                              color: "#222",
                              lineHeight: "18px",
                            }}
                          >
                            {bitCount} bit{bitCount > 1 ? "s" : ""}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemove(idx)}
                          style={{
                            marginLeft: 8,
                            color: "red",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                          title="Remove"
                        >
                          ✕
                        </button>
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
      <button
        onClick={handleAddField}
        style={{ marginTop: 12, padding: "6px 14px" }}
      >
        + Add Field
      </button>
      <div style={{ marginTop: 16, color: "#888" }}>
        Total bits: <b>{totalBits}</b>
      </div>
    </div>
  );
}
