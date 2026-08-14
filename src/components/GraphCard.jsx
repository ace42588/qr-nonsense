import { useState, useMemo, useEffect, useRef } from "react";
import { useQRData, useQRDataDispatch } from "@/state/qr/QRDataContext";
import { useInputs } from "@/state/inputs/InputContext";
import { useQArtResult } from "@/state/qr/QArtContext";
import { getCodewords } from "@/domain/qr";
import { MODE } from "@/domain/qr/constants/modes";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  block: { color: "#f59e0b", bg: "#fef3c7", hover: "#fde68a" }, // amber/orange
  errorCorrectionCodeword: { color: "#ef4444", bg: "#fee2e2", hover: "#fecaca" }, // red
};

const MODE_NAME_BY_BITS = Object.fromEntries(
  Object.values(MODE).map((m) => [m.bits, m.name])
);

export function GraphCard() {
  const { highlightModules, clearAllHighlights } = useQRDataDispatch();
  const { highlightedIds, segments: contextSegments, codewords: contextCodewords, blocks: contextBlocks, versionInfo } = useQRData();
  const { inputs } = useInputs();
  const { formatInfo: { errorCorrectionLevel } } = useInputs();
  const { qartResult } = useQArtResult();
  
  // Use QArt-optimized segments if available, otherwise use context segments
  const segments = useMemo(() => {
    return qartResult?.segments || contextSegments;
  }, [qartResult?.segments, contextSegments]);
  
  // Regenerate codewords and blocks from QArt segments if available
  const { codewords, blocks } = useMemo(() => {
    if (qartResult?.segments && qartResult.segments.length > 0) {
      try {
        const { codewords: regeneratedCodewords, blocks: regeneratedBlocks } = getCodewords(
          qartResult.segments,
          versionInfo.version,
          errorCorrectionLevel
        );
        return { codewords: regeneratedCodewords, blocks: regeneratedBlocks };
      } catch (err) {
        console.warn("Failed to regenerate codewords from QArt segments:", err);
        return { codewords: contextCodewords, blocks: contextBlocks };
      }
    }
    return { codewords: contextCodewords, blocks: contextBlocks };
  }, [qartResult?.segments, contextCodewords, contextBlocks, versionInfo.version, errorCorrectionLevel]);
  const [clickedNodeIds, setClickedNodeIds] = useState(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [tooltipNode, setTooltipNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  // Build graph nodes and edges
  const { nodes, edges, maxY, blocks: graphBlocks } = useMemo(() => {
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

    // Map segments to inputs. Mixed (auto) mode emits multiple mode groups per input,
    // so groups are keyed by segment.inputId when present.
    const groupsByInputId = new Map();
    inputs.forEach((input) => {
      groupsByInputId.set(input.id, []);
    });
    const terminatorSegments = [];
    const paddingSegments = [];
    const hasInputIds = segments.some((seg) => seg.inputId);

    if (hasInputIds) {
      let currentGroup = null;
      for (const seg of segments) {
        if (seg.type === "terminator") {
          terminatorSegments.push(seg);
          currentGroup = null;
          continue;
        }
        if (seg.type === "padding" || seg.type === "fill") {
          paddingSegments.push(seg);
          continue;
        }
        if (seg.type === "modeIndicator") {
          currentGroup = {
            modeIndicator: seg,
            characterCountIndicator: null,
            data: [],
          };
          const bucket = groupsByInputId.get(seg.inputId);
          if (bucket) bucket.push(currentGroup);
          continue;
        }
        if (!currentGroup) continue;
        if (seg.type === "characterCountIndicator") {
          currentGroup.characterCountIndicator = seg;
        } else {
          currentGroup.data.push(seg);
        }
      }
    } else {
      let segmentIndex = 0;
      inputs.forEach((input) => {
        const group = {
          modeIndicator: null,
          characterCountIndicator: null,
          data: [],
        };
        while (segmentIndex < segments.length) {
          const seg = segments[segmentIndex];
          if (seg.type === "modeIndicator" && !group.modeIndicator) {
            group.modeIndicator = seg;
            segmentIndex++;
          } else if (seg.type === "characterCountIndicator" && !group.characterCountIndicator) {
            group.characterCountIndicator = seg;
            segmentIndex++;
          } else if (seg.type === "modeIndicator" || seg.type === "characterCountIndicator") {
            break;
          } else if (seg.type === "terminator") {
            terminatorSegments.push(seg);
            segmentIndex++;
            break;
          } else if (seg.type === "padding" || seg.type === "fill") {
            paddingSegments.push(seg);
            segmentIndex++;
          } else {
            group.data.push(seg);
            segmentIndex++;
          }
        }
        groupsByInputId.get(input.id)?.push(group);
      });

      while (segmentIndex < segments.length) {
        const seg = segments[segmentIndex];
        if (seg.type === "terminator") {
          terminatorSegments.push(seg);
        } else if (seg.type === "padding" || seg.type === "fill") {
          paddingSegments.push(seg);
        }
        segmentIndex++;
      }
    }

    // Process each input and connect directly to segments
    inputs.forEach((input, inputIdx) => {
      const groups = groupsByInputId.get(input.id) || [];
      
      // Input node
      const inputNode = getOrCreateNode(
        `input-${input.id}`,
        "input",
        `Input ${inputIdx + 1}`,
        { inputId: input.id, bitIds: [] }
      );

      groups.forEach((group) => {
        if (group.modeIndicator) {
          const modeName =
            MODE_NAME_BY_BITS[group.modeIndicator.value] || input.mode;
          const modeSegmentNode = getOrCreateNode(
            `segment-${group.modeIndicator.id}`,
            "segment",
            `Mode: ${modeName}`,
            { segmentId: group.modeIndicator.id, bitIds: group.modeIndicator.bitIds || [] }
          );
          edges.push({ from: inputNode.id, to: modeSegmentNode.id });
        }

        if (group.characterCountIndicator) {
          const lengthValue = group.characterCountIndicator.value ?? 0;
          const lengthSegmentNode = getOrCreateNode(
            `segment-${group.characterCountIndicator.id}`,
            "segment",
            `Length: ${lengthValue}`,
            { segmentId: group.characterCountIndicator.id, bitIds: group.characterCountIndicator.bitIds || [] }
          );
          edges.push({ from: inputNode.id, to: lengthSegmentNode.id });
        }

        group.data.forEach((dataSegment) => {
          const dataSegmentNode = getOrCreateNode(
            `segment-${dataSegment.id}`,
            "segment",
            dataSegment.text || `Data ${dataSegment.id.slice(0, 6)}`,
            { segmentId: dataSegment.id, bitIds: dataSegment.bitIds || [] }
          );
          edges.push({ from: inputNode.id, to: dataSegmentNode.id });
        });
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
    // Create block nodes first
    blocks.forEach((block, blockIndex) => {
      getOrCreateNode(
        `block-${blockIndex}`,
        "block",
        `Block ${blockIndex + 1}`,
        { 
          blockIndex,
          dataCodewordIds: block.data.map(cw => cw.id),
          ecCodewordIds: block.errorCorrection.map(cw => cw.id),
          // Collect all bit IDs from both data and EC codewords in this block
          bitIds: [
            ...block.data.flatMap(cw => cw.bits.map(b => b.id)),
            ...block.errorCorrection.flatMap(cw => cw.bits.map(b => b.id))
          ]
        }
      );
    });

    // Create codeword nodes and connect to segments
    codewords.forEach((codeword) => {
      const codewordLabel = codeword.type === "data" 
        ? `Data ${codeword.id.slice(0, 6)}`
        : `EC ${codeword.id.slice(0, 6)}`;
      
      // Find which block this codeword belongs to
      let blockIndex = null;
      blocks.forEach((block, idx) => {
        if (codeword.type === "data" && block.data.some(cw => cw.id === codeword.id)) {
          blockIndex = idx;
        } else if (codeword.type === "errorCorrection" && block.errorCorrection.some(cw => cw.id === codeword.id)) {
          blockIndex = idx;
        }
      });
      
      const codewordNode = getOrCreateNode(
        `codeword-${codeword.id}`,
        codeword.type === "data" ? "dataCodeword" : "errorCorrectionCodeword",
        codewordLabel,
        { codewordId: codeword.id, bitIds: codeword.bits.map((b) => b.id), blockIndex }
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

    // Connect codewords to blocks
    blocks.forEach((block, blockIndex) => {
      const blockNode = nodeMap.get(`block-${blockIndex}`);
      if (!blockNode) return;
      
      // Connect all data codewords in this block to the block node
      block.data.forEach((dataCodeword) => {
        const dataNode = nodeMap.get(`codeword-${dataCodeword.id}`);
        if (dataNode && !edges.some(e => e.from === dataNode.id && e.to === blockNode.id)) {
          edges.push({ from: dataNode.id, to: blockNode.id });
        }
      });
      
      // Connect block node to all EC codewords in this block
      block.errorCorrection.forEach((ecCodeword) => {
        const ecNode = nodeMap.get(`codeword-${ecCodeword.id}`);
        if (ecNode && !edges.some(e => e.from === blockNode.id && e.to === ecNode.id)) {
          edges.push({ from: blockNode.id, to: ecNode.id });
        }
      });
    });

    // Calculate max Y for proper viewBox
    let maxY = 500;
    if (nodes.length > 0) {
      maxY = Math.max(...nodes.map(n => n.y)) + 100;
    }

    return { nodes, edges, maxY, blocks };
  }, [inputs, segments, codewords, blocks]);

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
      dataCodewords: [],
      blocks: [],
      ecCodewords: [],
    };

    nodes.forEach((node) => {
      if (node.type === "input") {
        layers.input.push(node);
      } else if (node.type === "segment" || node.type === "terminator" || node.type === "padding") {
        layers.segments.push(node);
      } else if (node.type === "dataCodeword") {
        layers.dataCodewords.push(node);
      } else if (node.type === "block") {
        layers.blocks.push(node);
      } else if (node.type === "errorCorrectionCodeword") {
        layers.ecCodewords.push(node);
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

    // Data codewords layer
    const dataCodewordCols = Math.min(layers.dataCodewords.length, Math.floor(maxWidth / horizontalSpacing) || 1);
    layers.dataCodewords.forEach((node, i) => {
      const row = Math.floor(i / dataCodewordCols);
      const col = i % dataCodewordCols;
      const totalWidth = Math.min(dataCodewordCols, layers.dataCodewords.length - row * dataCodewordCols) * horizontalSpacing;
      const startX = padding + (maxWidth - totalWidth) / 2;
      node.x = startX + col * horizontalSpacing;
      node.y = currentY + row * (nodeHeight + 15);
    });
    if (layers.dataCodewords.length > 0) {
      currentY += Math.ceil(layers.dataCodewords.length / dataCodewordCols) * (nodeHeight + 15) + verticalSpacing;
    }

    // Blocks layer
    const blockCols = Math.min(layers.blocks.length, Math.floor(maxWidth / horizontalSpacing) || 1);
    layers.blocks.forEach((node, i) => {
      const row = Math.floor(i / blockCols);
      const col = i % blockCols;
      const totalWidth = Math.min(blockCols, layers.blocks.length - row * blockCols) * horizontalSpacing;
      const startX = padding + (maxWidth - totalWidth) / 2;
      node.x = startX + col * horizontalSpacing;
      node.y = currentY + row * (nodeHeight + 15);
    });
    if (layers.blocks.length > 0) {
      currentY += Math.ceil(layers.blocks.length / blockCols) * (nodeHeight + 15) + verticalSpacing;
    }

    // EC codewords layer
    const ecCodewordCols = Math.min(layers.ecCodewords.length, Math.floor(maxWidth / horizontalSpacing) || 1);
    layers.ecCodewords.forEach((node, i) => {
      const row = Math.floor(i / ecCodewordCols);
      const col = i % ecCodewordCols;
      const totalWidth = Math.min(ecCodewordCols, layers.ecCodewords.length - row * ecCodewordCols) * horizontalSpacing;
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
      clearAllHighlights();
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
    if (!clickedNodeIds.has(node.id)) {
      clearAllHighlights();
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
            {/* Draw boundary boxes for blocks (around block nodes and their codewords) */}
            {graphBlocks && graphBlocks.length > 0 && graphBlocks.map((block, blockIndex) => {
              const blockNode = nodes.find(n => n.id === `block-${blockIndex}`);
              if (!blockNode || blockNode.x === 0 || blockNode.y === 0) return null;
              
              // Find all codewords belonging to this block
              const blockCodewordNodes = nodes.filter(n => 
                (n.type === "dataCodeword" || n.type === "errorCorrectionCodeword") && 
                n.data?.blockIndex === blockIndex &&
                n.x > 0 && n.y > 0
              );
              
              // Include the block node itself in the bounding box calculation
              const allBlockNodes = [blockNode, ...blockCodewordNodes];
              
              if (allBlockNodes.length === 0) return null;
              
              const minX = Math.min(...allBlockNodes.map(n => n.x)) - 10;
              const maxX = Math.max(...allBlockNodes.map(n => n.x + 110)) + 10;
              const minY = Math.min(...allBlockNodes.map(n => n.y)) - 10;
              const maxY = Math.max(...allBlockNodes.map(n => n.y + 35)) + 10;
              
              return (
                <rect
                  key={`block-box-${blockIndex}`}
                  x={minX}
                  y={minY}
                  width={maxX - minX}
                  height={maxY - minY}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  opacity="0.4"
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
