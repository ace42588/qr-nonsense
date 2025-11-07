import { useState, useMemo, useEffect, useRef } from "react";
import { useQRData, useQRDataDispatch } from "@/state/qr/QRDataContext";
import { useInputs } from "@/state/inputs/InputContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { gerVersionInfo } from "@/domain/qr/versionUtils";

// Node types for color coding
const NODE_TYPES = {
  input: { color: "#3b82f6", bg: "#dbeafe", hover: "#bfdbfe" }, // blue
  mode: { color: "#8b5cf6", bg: "#ede9fe", hover: "#ddd6fe" }, // purple
  length: { color: "#f59e0b", bg: "#fef3c7", hover: "#fde68a" }, // amber
  value: { color: "#10b981", bg: "#d1fae5", hover: "#a7f3d0" }, // green
  segment: { color: "#06b6d4", bg: "#cffafe", hover: "#a5f3fc" }, // cyan
  terminator: { color: "#10b981", bg: "#d1fae5", hover: "#a7f3d0", strokeDasharray: "5,5" }, // green with dashed border
  padding: { color: "#6b7280", bg: "#f3f4f6", hover: "#e5e7eb", strokeDasharray: "5,5" }, // gray with dashed border
  dataCodeword: { color: "#3b82f6", bg: "#dbeafe", hover: "#bfdbfe" }, // blue
  errorCorrectionCodeword: { color: "#ef4444", bg: "#fee2e2", hover: "#fecaca" }, // red
};

export function GraphCard() {
  const { highlightModules, clearHighlightedModules } = useQRDataDispatch();
  const { highlightedIds, segments, codewords, version } = useQRData();
  const { inputs } = useInputs();
  const { formatInfo: { errorCorrectionLevel } } = useInputs();
  const [clickedNodeIds, setClickedNodeIds] = useState(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [tooltipNode, setTooltipNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  // Build graph nodes and edges
  const { nodes, edges, maxY, blockGroups } = useMemo(() => {
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    // Helper to create or get node
    const getOrCreateNode = (id, type, label, data) => {
      if (!nodeMap.has(id)) {
        const node = { id, type, label, data, x: 0, y: 0 };
        nodeMap.set(id, node);
        nodes.push(node);
      }
      return nodeMap.get(id);
    };

    // Map segments to inputs based on order
    // Segments are created in order: for each input: modeIndicator, characterCountIndicator, then data segments
    // Terminator and padding appear after all inputs
    const inputToSegments = new Map();
    const terminatorSegments = [];
    const paddingSegments = [];
    let segmentIndex = 0;
    
    inputs.forEach((input) => {
      const inputSegments = {
        modeIndicator: null,
        characterCountIndicator: null,
        data: []
      };
      
      // Find segments for this input by looking for modeIndicator and characterCountIndicator
      // These appear before the data segments for each input
      while (segmentIndex < segments.length) {
        const seg = segments[segmentIndex];
        if (seg.type === "modeIndicator" && !inputSegments.modeIndicator) {
          inputSegments.modeIndicator = seg;
          segmentIndex++;
        } else if (seg.type === "characterCountIndicator" && !inputSegments.characterCountIndicator) {
          inputSegments.characterCountIndicator = seg;
          segmentIndex++;
        } else if (seg.type === "modeIndicator" || seg.type === "characterCountIndicator") {
          // This belongs to the next input
          break;
        } else if (seg.type === "terminator") {
          // Terminator segment - collect separately and stop processing this input
          terminatorSegments.push(seg);
          segmentIndex++;
          break; // Terminator marks the end of data for this input
        } else if (seg.type === "padding") {
          // Padding segment - collect separately but continue (padding can appear between inputs)
          paddingSegments.push(seg);
          segmentIndex++;
        } else {
          // Data segment
          inputSegments.data.push(seg);
          segmentIndex++;
        }
      }
      
      inputToSegments.set(input.id, inputSegments);
    });
    
    // Collect any remaining terminator and padding segments after all inputs
    while (segmentIndex < segments.length) {
      const seg = segments[segmentIndex];
      if (seg.type === "terminator") {
        terminatorSegments.push(seg);
      } else if (seg.type === "padding") {
        paddingSegments.push(seg);
      }
      segmentIndex++;
    }

    // Process each input and connect directly to segments
    inputs.forEach((input, inputIdx) => {
      const inputSegments = inputToSegments.get(input.id) || { modeIndicator: null, characterCountIndicator: null, data: [] };
      
      // Input node
      const inputNode = getOrCreateNode(
        `input-${input.id}`,
        "input",
        `Input ${inputIdx + 1}`,
        { inputId: input.id, bitIds: [] }
      );

      // Connect input directly to modeIndicator segment (Mode)
      if (inputSegments.modeIndicator) {
        const modeSegmentNode = getOrCreateNode(
          `segment-${inputSegments.modeIndicator.id}`,
          "segment",
          `Mode: ${input.mode}`,
          { segmentId: inputSegments.modeIndicator.id, bitIds: inputSegments.modeIndicator.bitIds || [] }
        );
        edges.push({ from: inputNode.id, to: modeSegmentNode.id });
      }

      // Connect input directly to characterCountIndicator segment (Length)
      // Use the segment.value which contains the actual character count
      if (inputSegments.characterCountIndicator) {
        const lengthValue = inputSegments.characterCountIndicator.value ?? 0;
        const lengthSegmentNode = getOrCreateNode(
          `segment-${inputSegments.characterCountIndicator.id}`,
          "segment",
          `Length: ${lengthValue}`,
          { segmentId: inputSegments.characterCountIndicator.id, bitIds: inputSegments.characterCountIndicator.bitIds || [] }
        );
        edges.push({ from: inputNode.id, to: lengthSegmentNode.id });
      }

      // Connect input directly to data segments (Value) - all data segments are direct descendants
      inputSegments.data.forEach((dataSegment) => {
        const dataSegmentNode = getOrCreateNode(
          `segment-${dataSegment.id}`,
          "segment",
          dataSegment.text || `Data ${dataSegment.id.slice(0, 6)}`,
          { segmentId: dataSegment.id, bitIds: dataSegment.bitIds || [] }
        );
        edges.push({ from: inputNode.id, to: dataSegmentNode.id });
      });
    });

    // Create terminator and padding segment nodes - these are not part of input data
    // They should be visually distinct and not connected to inputs
    terminatorSegments.forEach((segment) => {
      getOrCreateNode(
        `segment-${segment.id}`,
        "terminator",
        "Terminator",
        { segmentId: segment.id, bitIds: segment.bitIds || [], value: segment.value }
      );
    });

    paddingSegments.forEach((segment) => {
      getOrCreateNode(
        `segment-${segment.id}`,
        "padding",
        "Padding",
        { segmentId: segment.id, bitIds: segment.bitIds || [], value: segment.value }
      );
    });

    // Separate data and EC codewords (they're interleaved in the array)
    const dataCodewords = codewords.filter(cw => cw.type === "data");
    const ecCodewords = codewords.filter(cw => cw.type === "errorCorrection");
    
    // Reconstruct blocks to understand EC codeword relationships
    // We need to de-interleave the codewords to reconstruct blocks
    const deinterleave = (arr, numBlocks) => {
      const result = Array.from({ length: numBlocks }, () => []);
      arr.forEach((item, index) => {
        result[index % numBlocks].push(item);
      });
      return result;
    };
    
    // Get version info to reconstruct blocks
    let blockGroups = [];
    if (version > 0 && errorCorrectionLevel !== undefined) {
      try {
        const { ecBlocks } = gerVersionInfo(errorCorrectionLevel, version);
        
        // De-interleave data codewords
        const totalBlocks = ecBlocks.reduce((sum, block) => sum + block.numBlocks, 0);
        const deinterleavedData = deinterleave(dataCodewords, totalBlocks);
        const deinterleavedEC = deinterleave(ecCodewords, totalBlocks);
        
        // Reconstruct blocks
        let blockIndex = 0;
        ecBlocks.forEach(({ numBlocks }) => {
          for (let i = 0; i < numBlocks; i++) {
            const blockData = deinterleavedData[blockIndex] || [];
            const blockEC = deinterleavedEC[blockIndex] || [];
            blockGroups.push({
              blockIndex,
              dataCodewords: blockData,
              ecCodewords: blockEC
            });
            blockIndex++;
          }
        });
      } catch (e) {
        // If we can't reconstruct blocks, fall back to connecting all EC to all data
        console.warn("Could not reconstruct blocks:", e);
      }
    }

    // Create codeword nodes and connect to segments
    codewords.forEach((codeword) => {
      const codewordLabel = codeword.type === "data" 
        ? `Data ${codeword.id.slice(0, 6)}`
        : `EC ${codeword.id.slice(0, 6)}`;
      const codewordNode = getOrCreateNode(
        `codeword-${codeword.id}`,
        codeword.type === "data" ? "dataCodeword" : "errorCorrectionCodeword",
        codewordLabel,
        { codewordId: codeword.id, bitIds: codeword.bits.map((b) => b.id), blockIndex: null }
      );

      // Connect data codeword to segments that contributed to it
      if (codeword.type === "data") {
        const codewordBitIds = new Set(codeword.bits.map((b) => b.id));
        segments.forEach((segment) => {
          if (segment.bitIds && segment.bitIds.some((id) => codewordBitIds.has(id))) {
            const segmentNode = nodeMap.get(`segment-${segment.id}`);
            if (segmentNode && !edges.some(e => e.from === segmentNode.id && e.to === codewordNode.id)) {
              edges.push({ from: segmentNode.id, to: codewordNode.id });
            }
          }
        });
      }
    });

    // Connect EC codewords to their source data codewords via blocks
    blockGroups.forEach((block) => {
      block.ecCodewords.forEach((ecCodeword) => {
        const ecNode = nodeMap.get(`codeword-${ecCodeword.id}`);
        if (!ecNode) return;
        
        // Store block index for visual grouping
        ecNode.data.blockIndex = block.blockIndex;
        
        // Connect EC codeword to all data codewords in its block
        block.dataCodewords.forEach((dataCodeword) => {
          const dataNode = nodeMap.get(`codeword-${dataCodeword.id}`);
          if (dataNode && !edges.some(e => e.from === dataNode.id && e.to === ecNode.id)) {
            edges.push({ from: dataNode.id, to: ecNode.id });
          }
          // Also store block index for data codewords
          if (dataNode) {
            dataNode.data.blockIndex = block.blockIndex;
          }
        });
      });
    });
    
    // If we couldn't reconstruct blocks, connect all EC codewords to all data codewords
    if (blockGroups.length === 0) {
      ecCodewords.forEach((ecCodeword) => {
        const ecNode = nodeMap.get(`codeword-${ecCodeword.id}`);
        if (!ecNode) return;
        
        dataCodewords.forEach((dataCodeword) => {
          const dataNode = nodeMap.get(`codeword-${dataCodeword.id}`);
          if (dataNode && !edges.some(e => e.from === dataNode.id && e.to === ecNode.id)) {
            edges.push({ from: dataNode.id, to: ecNode.id });
          }
        });
      });
    }

    // Calculate max Y for proper viewBox
    let maxY = 500;
    if (nodes.length > 0) {
      maxY = Math.max(...nodes.map(n => n.y)) + 100;
    }

    return { nodes, edges, maxY, blockGroups };
  }, [inputs, segments, codewords, version, errorCorrectionLevel]);

  // Layout nodes using a hierarchical layout
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const calculateLayout = () => {
    if (!svgRef.current || nodes.length === 0) return;

    const svgElement = svgRef.current;
    const rect = svgElement.getBoundingClientRect();
    const width = rect.width || 800;
    const height = Math.max(rect.height || 500, maxY);
    const padding = 50;
    const nodeHeight = 35;
    const horizontalSpacing = 130;
    const verticalSpacing = 70;

    // Group nodes by type/layer
    const layers = {
      input: [],
      attributes: [],
      segments: [],
      codewords: [],
    };

    nodes.forEach((node) => {
      if (node.type === "input") {
        layers.input.push(node);
      } else if (node.type === "segment" || node.type === "terminator" || node.type === "padding") {
        layers.segments.push(node);
      } else {
        layers.codewords.push(node);
      }
    });

    // Position nodes in layers
    let currentY = padding;
    const maxWidth = width - padding * 2;
    
    // Input layer (centered)
    const inputCols = Math.min(layers.input.length, Math.floor(maxWidth / horizontalSpacing) || 1);
    layers.input.forEach((node, i) => {
      const row = Math.floor(i / inputCols);
      const col = i % inputCols;
      const totalWidth = Math.min(inputCols, layers.input.length - row * inputCols) * horizontalSpacing;
      const startX = padding + (maxWidth - totalWidth) / 2;
      node.x = startX + col * horizontalSpacing;
      node.y = currentY + row * (nodeHeight + 20);
    });
    if (layers.input.length > 0) {
      currentY += Math.ceil(layers.input.length / inputCols) * (nodeHeight + 20) + verticalSpacing;
    }

    // Attributes layer (arranged in grid)
    const attrCols = Math.min(layers.attributes.length, Math.floor(maxWidth / horizontalSpacing) || 1);
    layers.attributes.forEach((node, i) => {
      const row = Math.floor(i / attrCols);
      const col = i % attrCols;
      const totalWidth = Math.min(attrCols, layers.attributes.length - row * attrCols) * horizontalSpacing;
      const startX = padding + (maxWidth - totalWidth) / 2;
      node.x = startX + col * horizontalSpacing;
      node.y = currentY + row * (nodeHeight + 15);
    });
    if (layers.attributes.length > 0) {
      currentY += Math.ceil(layers.attributes.length / attrCols) * (nodeHeight + 15) + verticalSpacing;
    }

    // Segments layer
    const segmentCols = Math.min(layers.segments.length, Math.floor(maxWidth / horizontalSpacing) || 1);
    layers.segments.forEach((node, i) => {
      const row = Math.floor(i / segmentCols);
      const col = i % segmentCols;
      const totalWidth = Math.min(segmentCols, layers.segments.length - row * segmentCols) * horizontalSpacing;
      const startX = padding + (maxWidth - totalWidth) / 2;
      node.x = startX + col * horizontalSpacing;
      node.y = currentY + row * (nodeHeight + 15);
    });
    if (layers.segments.length > 0) {
      currentY += Math.ceil(layers.segments.length / segmentCols) * (nodeHeight + 15) + verticalSpacing;
    }

    // Codewords layer
    const codewordCols = Math.min(layers.codewords.length, Math.floor(maxWidth / horizontalSpacing) || 1);
    layers.codewords.forEach((node, i) => {
      const row = Math.floor(i / codewordCols);
      const col = i % codewordCols;
      const totalWidth = Math.min(codewordCols, layers.codewords.length - row * codewordCols) * horizontalSpacing;
      const startX = padding + (maxWidth - totalWidth) / 2;
      node.x = startX + col * horizontalSpacing;
      node.y = currentY + row * (nodeHeight + 15);
    });

    // Update viewBox to fit all content
    const calculatedMaxY = Math.max(...nodes.map(n => n.y)) + nodeHeight + padding;
    setViewBox(prev => ({
      ...prev,
      width: Math.max(width, 800),
      height: Math.max(height, calculatedMaxY)
    }));
  };

  useEffect(() => {
    calculateLayout();

    // Recalculate layout on window resize
    const handleResize = () => {
      calculateLayout();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, maxY]);

  // Handle pan/drag
  const handleMouseDown = (e) => {
    // Only start dragging if clicking on background (not on a node)
    if (e.target === containerRef.current || e.target.tagName === 'svg' || e.target.tagName === 'line') {
      if (e.button === 0) { // Left mouse button
        setIsDragging(true);
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const scaleX = viewBox.width / rect.width;
          const scaleY = viewBox.height / rect.height;
          setDragStart({ 
            x: (e.clientX - rect.left) * scaleX + viewBox.x, 
            y: (e.clientY - rect.top) * scaleY + viewBox.y 
          });
        }
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;
      const currentX = (e.clientX - rect.left) * scaleX;
      const currentY = (e.clientY - rect.top) * scaleY;
      
      setViewBox(prev => ({
        ...prev,
        x: dragStart.x - currentX,
        y: dragStart.y - currentY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset view on double click
  const handleDoubleClick = (e) => {
    // Only reset if double-clicking on background
    if (e.target === containerRef.current || e.target.tagName === 'svg' || e.target.tagName === 'line') {
      setViewBox({ x: 0, y: 0, width: 800, height: maxY });
    }
  };

  // Check if a node should be highlighted
  const isNodeHighlighted = (node) => {
    if (hoveredNodeId === node.id) return true;
    if (clickedNodeIds.has(node.id)) return true;
    
    // Check if any of the node's bitIds are highlighted
    if (node.data?.bitIds) {
      return node.data.bitIds.some((id) => highlightedIds.includes(id));
    }
    return false;
  };

  // Handle node click
  const handleNodeClick = (node) => {
    if (clickedNodeIds.has(node.id)) {
      setClickedNodeIds((prev) => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
      if (node.data?.bitIds) {
        clearHighlightedModules(node.data.bitIds);
      }
    } else {
      setClickedNodeIds((prev) => new Set(prev).add(node.id));
      if (node.data?.bitIds && node.data.bitIds.length > 0) {
        highlightModules(node.data.bitIds);
      }
    }
  };

  // Handle node hover
  const handleNodeMouseEnter = (node, event) => {
    setHoveredNodeId(node.id);
    if (!clickedNodeIds.has(node.id) && node.data?.bitIds && node.data.bitIds.length > 0) {
      highlightModules(node.data.bitIds);
    }
    
    // Show tooltip for terminator/padding nodes with value
    if ((node.type === "terminator" || node.type === "padding") && node.data?.value !== undefined) {
      if (event && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        setTooltipNode(node);
        setTooltipPosition({
          x: event.clientX - containerRect.left,
          y: event.clientY - containerRect.top
        });
      }
    }
  };

  const handleNodeMouseLeave = (node) => {
    setHoveredNodeId(null);
    if (!clickedNodeIds.has(node.id) && node.data?.bitIds && node.data.bitIds.length > 0) {
      clearHighlightedModules(node.data.bitIds);
    }
    if (tooltipNode?.id === node.id) {
      setTooltipNode(null);
    }
  };

  // Effect to handle module hover highlighting nodes
  // The highlighting is handled by isNodeHighlighted function which checks highlightedIds
  // No additional logic needed here

  const nodeTypeStyle = (node) => {
    const style = NODE_TYPES[node.type] || NODE_TYPES.input;
    const isHighlighted = isNodeHighlighted(node);
    return {
      fill: isHighlighted ? style.hover : style.bg,
      stroke: style.color,
      strokeWidth: isHighlighted ? 3 : 2,
      strokeDasharray: style.strokeDasharray || "none",
    };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <h3 className="text-lg font-semibold">Data Flow Graph</h3>
      </CardHeader>
      <CardContent className="relative flex-1 min-h-0">
        <ScrollArea className="flex-1 w-full h-full">
          <div
            ref={containerRef}
            className="w-full h-full relative"
            style={{ cursor: isDragging ? 'grabbing' : 'default' }}
          >
            <svg
              ref={svgRef}
              width="100%"
              height={viewBox.height}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
              className="overflow-visible"
              preserveAspectRatio="xMidYMid meet"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              style={{ cursor: isDragging ? 'grabbing' : 'default' }}
            >
            {/* Draw boundary boxes for block groups */}
            {blockGroups && blockGroups.length > 0 && blockGroups.map((block) => {
              const blockNodes = nodes.filter(n => 
                (n.type === "dataCodeword" || n.type === "errorCorrectionCodeword") && 
                n.data?.blockIndex === block.blockIndex &&
                n.x > 0 && n.y > 0 // Only draw if nodes have been laid out
              );
              
              if (blockNodes.length === 0) return null;
              
              const minX = Math.min(...blockNodes.map(n => n.x)) - 10;
              const maxX = Math.max(...blockNodes.map(n => n.x + 110)) + 10;
              const minY = Math.min(...blockNodes.map(n => n.y)) - 10;
              const maxY = Math.max(...blockNodes.map(n => n.y + 35)) + 10;
              
              return (
                <rect
                  key={`block-${block.blockIndex}`}
                  x={minX}
                  y={minY}
                  width={maxX - minX}
                  height={maxY - minY}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  opacity="0.6"
                  rx="4"
                  className="pointer-events-none"
                />
              );
            })}

            {/* Draw edges */}
            {edges.map((edge, i) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const fromX = fromNode.x + 55;
              const fromY = fromNode.y + 17.5;
              const toX = toNode.x + 55;
              const toY = toNode.y + 17.5;

              return (
                <line
                  key={`edge-${i}`}
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}

            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Draw nodes */}
            {nodes.map((node) => {
              const style = nodeTypeStyle(node);
              const isHighlighted = isNodeHighlighted(node);

              return (
                <g key={node.id}>
                  <rect
                    x={node.x}
                    y={node.y}
                    width="110"
                    height="35"
                    rx="6"
                    {...style}
                    className="cursor-pointer transition-all"
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
                    onMouseLeave={() => handleNodeMouseLeave(node)}
                  />
                  <text
                    x={node.x + 55}
                    y={node.y + 22}
                    textAnchor="middle"
                    fontSize="10"
                    fill={style.stroke}
                    fontWeight={isHighlighted ? "bold" : "normal"}
                    className="pointer-events-none select-none"
                  >
                    {node.label.length > 12 ? node.label.slice(0, 12) + "..." : node.label}
                  </text>
                  {/* SVG title for native tooltip fallback */}
                  {(node.type === "terminator" || node.type === "padding") && node.data?.value !== undefined && (
                    <title>{`Byte value: ${node.data.value}`}</title>
                  )}
                </g>
              );
            })}
          </svg>
          {isDragging && (
            <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
              Drag to pan • Double-click to reset
            </div>
          )}
          {/* Tooltip for terminator/padding nodes */}
          {tooltipNode && (tooltipNode.type === "terminator" || tooltipNode.type === "padding") && tooltipNode.data?.value !== undefined && (
            <div
              className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none"
              style={{
                left: `${tooltipPosition.x + 10}px`,
                top: `${tooltipPosition.y - 30}px`,
                transform: 'translateX(-50%)'
              }}
            >
              Byte value: {tooltipNode.data.value}
            </div>
          )}
        </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

