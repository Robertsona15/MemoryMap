import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { emotions, coreEmotionTypes, compoundEmotions } from '../data/schema';
import { getFileUrlFromHandle, saveMemory } from '../utils/storage';

const interpolateColor = (colorA, colorB, t) => {
  if (t <= 0) return colorA;
  if (t >= 1) return colorB;
  const hex2rgb = (hex) => {
    let v = hex.replace('#', '');
    if (v.length === 3) v = v.split('').map(c => c+c).join('');
    const num = parseInt(v, 16);
    return [num >> 16, (num >> 8) & 255, num & 255];
  };
  const cA = hex2rgb(colorA);
  const cB = hex2rgb(colorB);
  const r = Math.round(cA[0] + (cB[0] - cA[0]) * t);
  const g = Math.round(cA[1] + (cB[1] - cA[1]) * t);
  const b = Math.round(cA[2] + (cB[2] - cA[2]) * t);
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).padStart(6, '0')}`;
};

const getCoreColor = (type) => {
  const entry = Object.entries(emotions).find(([k, v]) => v.type === type && v.level === 2);
  return entry ? entry[1].color : '#FFFFFF';
};

// Generate the 48 Mathematical Zones for the Wheel
const generateZones = () => {
  const zones = [];
  const sliceSize = Math.PI / 8; // 22.5 degrees

  for (let c = 0; c < 8; c++) {
    const baseAngle = c * Math.PI / 4;
    const type = coreEmotionTypes[c];

    // --- CORE SPOKE ---
    const coreStart = baseAngle - sliceSize / 2;
    const coreEnd = baseAngle + sliceSize / 2;
    
    const getCoreKey = (lvl) => Object.entries(emotions).find(([k,v]) => v.type === type && v.level === lvl)?.[0];
    const l1Key = getCoreKey(1);
    const l2Key = getCoreKey(2);
    const l3Key = getCoreKey(3);

    if (l1Key) zones.push({ emotionKey: l1Key, label: emotions[l1Key].label, color: emotions[l1Key].color, innerRadius: 60, outerRadius: 160, startAngle: coreStart, endAngle: coreEnd });
    if (l2Key) zones.push({ emotionKey: l2Key, label: emotions[l2Key].label, color: emotions[l2Key].color, innerRadius: 160, outerRadius: 260, startAngle: coreStart, endAngle: coreEnd });
    if (l3Key) zones.push({ emotionKey: l3Key, label: emotions[l3Key].label, color: emotions[l3Key].color, innerRadius: 260, outerRadius: 360, startAngle: coreStart, endAngle: coreEnd });

    // Secondary Dyad (Distance 2, e.g., Joy + Fear -> sits on Trust spoke)
    const cSec1 = coreEmotionTypes[(c - 1 + 8) % 8];
    const cSec2 = coreEmotionTypes[(c + 1) % 8];
    const secDyad = compoundEmotions.find(e => e.components.includes(cSec1) && e.components.includes(cSec2));
    if (secDyad) {
      const c1 = getCoreColor(cSec1);
      const c2 = getCoreColor(cSec2);
      zones.push({ emotionKey: secDyad.id, label: secDyad.label, colors: [c1, c2], innerRadius: 360, outerRadius: 460, startAngle: coreStart, endAngle: coreEnd });
    }

    // --- BETWEEN SPOKE ---
    const betStart = baseAngle + sliceSize / 2;
    const betEnd = baseAngle + 3 * sliceSize / 2;

    // Primary Dyad (Distance 1, e.g., Joy + Trust)
    const cPri1 = coreEmotionTypes[c];
    const cPri2 = coreEmotionTypes[(c + 1) % 8];
    const priDyad = compoundEmotions.find(e => e.components.includes(cPri1) && e.components.includes(cPri2));
    if (priDyad) {
      const c1 = getCoreColor(cPri1);
      const c2 = getCoreColor(cPri2);
      zones.push({ emotionKey: priDyad.id, label: priDyad.label, colors: [c1, c2], innerRadius: 160, outerRadius: 360, startAngle: betStart, endAngle: betEnd });
    }

    // Tertiary Dyad (Distance 3, e.g., Joy + Surprise -> sits between Trust and Fear)
    const cTer1 = coreEmotionTypes[(c - 1 + 8) % 8];
    const cTer2 = coreEmotionTypes[(c + 2) % 8];
    const terDyad = compoundEmotions.find(e => e.components.includes(cTer1) && e.components.includes(cTer2));
    if (terDyad) {
      const c1 = getCoreColor(cTer1);
      const c2 = getCoreColor(cTer2);
      zones.push({ emotionKey: terDyad.id, label: terDyad.label, colors: [c1, c2], innerRadius: 360, outerRadius: 460, startAngle: betStart, endAngle: betEnd });
    }
  }
  return zones;
};

const wheelZones = generateZones();

export default function QuickSortMap({ memories, onMemorySorted }) {
  const fgRef = useRef();
  const [image, setImage] = useState(null);
  const [targetEmotionCount, setTargetEmotionCount] = useState(0);

  const unsorted = useMemo(() => {
    return memories.filter(m => (m.emotions || []).length === targetEmotionCount);
  }, [memories, targetEmotionCount]);

  const activeMemory = unsorted.length > 0 ? unsorted[0] : null;

  useEffect(() => {
    let active = true;
    async function loadImg() {
      if (!activeMemory) {
        if (active) setImage(null);
        return;
      }
      try {
        const url = await getFileUrlFromHandle(activeMemory.fileHandle);
        const img = new Image();
        img.src = url;
        img.onload = () => {
          if (active) setImage(img);
        };
      } catch (e) {
        console.error("Failed to load image for quick sort", e);
        if (active) setImage(null);
      }
    }
    loadImg();
    return () => { active = false; };
  }, [activeMemory]);

  const graphData = useMemo(() => {
    const nodes = [
      { id: 'WHEEL', isWheel: true, fx: 0, fy: 0, x: 0, y: 0 }
    ];

    if (activeMemory) {
      nodes.push({
        id: `memory_${activeMemory.id}`,
        isMemory: true,
        memory: activeMemory,
        color: '#FFFFFF',
        x: 0,
        y: 0,
        fx: 0,
        fy: 0
      });
    }

    return { nodes, links: [] };
  }, [activeMemory]);

  useEffect(() => {
    const handleResize = () => {
      if (fgRef.current) {
        // Zoom to perfectly fit the R=460 wheel with some padding
        fgRef.current.zoomToFit(400, 40);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    const timer = setTimeout(() => {
      handleResize();
    }, 150);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [activeMemory]);

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    if (typeof node.x !== 'number' || typeof node.y !== 'number') return;
    
    if (node.isWheel) {
      // Draw the Plutchik Wheel Background
      wheelZones.forEach(zone => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, zone.outerRadius, zone.startAngle, zone.endAngle, false);
        ctx.arc(node.x, node.y, zone.innerRadius, zone.endAngle, zone.startAngle, true);
        ctx.closePath();
        
        const isAttached = activeMemory && activeMemory.emotions && activeMemory.emotions.includes(zone.emotionKey);

        if (isAttached) {
          ctx.fillStyle = 'rgba(50, 50, 50, 0.4)';
        } else if (zone.colors) {
          const cx1 = node.x + Math.cos(zone.startAngle) * zone.outerRadius;
          const cy1 = node.y + Math.sin(zone.startAngle) * zone.outerRadius;
          const cx2 = node.x + Math.cos(zone.endAngle) * zone.outerRadius;
          const cy2 = node.y + Math.sin(zone.endAngle) * zone.outerRadius;
          const grad = ctx.createLinearGradient(cx1, cy1, cx2, cy2);
          grad.addColorStop(0, zone.colors[0]);
          grad.addColorStop(1, zone.colors[1]);
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = zone.color;
        }
        
        ctx.globalAlpha = isAttached ? 0.3 : 0.65; // Glassmorphism transparency
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Draw vibrant, glowing stroke
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isAttached ? 'rgba(100,100,100,0.5)' : (zone.colors ? zone.colors[0] : zone.color);
        ctx.shadowBlur = isAttached ? 0 : 5;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw Label text perfectly centered and rotated inside the wedge
        const midAngle = (zone.startAngle + zone.endAngle) / 2;
        const midRadius = (zone.innerRadius + zone.outerRadius) / 2;
        const textX = node.x + Math.cos(midAngle) * midRadius;
        const textY = node.y + Math.sin(midAngle) * midRadius;

        ctx.save();
        ctx.translate(textX, textY);
        
        // Glassmorphic glowing text
        ctx.fillStyle = isAttached ? 'rgba(150,150,150,0.5)' : '#FFFFFF';
        ctx.shadowBlur = isAttached ? 0 : 5;
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let rotAngle = midAngle;
        rotAngle = (rotAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        if (rotAngle > Math.PI / 2 && rotAngle < 3 * Math.PI / 2) {
          rotAngle += Math.PI; // Flip text so it is always readable
        }
        ctx.rotate(rotAngle);
        
        // Scale text size down when zoomed out
        const fontSize = 14; 
        ctx.font = `bold ${fontSize / globalScale}px Arial`;
        ctx.fillText(zone.label, 0, 0);
        ctx.shadowBlur = 0; // reset
        ctx.restore();
      });

      // Draw the dark center hole where the memory starts
      ctx.beginPath();
      ctx.arc(node.x, node.y, 60, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fill();

    } else if (node.isMemory) {
      const size = 50; 
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.shadowBlur = 35; 
      ctx.shadowColor = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 4 / globalScale;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (image) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(image, node.x - size, node.y - size, size * 2, size * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${12 / globalScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("Loading...", node.x, node.y);
      }
    }
  }, [image]);

  const handleNodeDragEnd = async (node) => {
    if (!node.isMemory) return;

    const dx = node.x; 
    const dy = node.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    const theta = Math.atan2(dy, dx);

    let matchedZone = null;
    const sliceSize = Math.PI / 8;

    for (const z of wheelZones) {
      if (r >= z.innerRadius && r <= z.outerRadius) {
        const midAngle = (z.startAngle + z.endAngle) / 2;
        let diff = theta - midAngle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        
        if (Math.abs(diff) <= sliceSize / 2 + 0.001) {
          matchedZone = z;
          break;
        }
      }
    }

    if (matchedZone && activeMemory) {
      const updatedMem = {
        ...activeMemory,
        emotions: Array.from(new Set([...(activeMemory.emotions || []), matchedZone.emotionKey]))
      };
      
      const saved = await saveMemory(updatedMem);
      onMemorySorted(saved);
      // It will auto-refresh and pop the next memory
    } else {
      // Missed the wheel (or dropped in the center hole) -> snap back perfectly to center
      node.fx = 0;
      node.fy = 0;
    }
  };

  const handleNodeDrag = (node) => {
    if (node.isMemory) {
      node.fx = node.x;
      node.fy = node.y;
    }
  };

  if (unsorted.length === 0) {
    return (
      <div className="glass-panel" style={{ width: '100%', height: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--color-primary)', textShadow: '0 0 10px var(--color-glow)' }}>All Caught Up!</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem', marginBottom: '2rem' }}>No memories found with exactly {targetEmotionCount} emotion{targetEmotionCount === 1 ? '' : 's'} attached.</p>
        <select 
          value={targetEmotionCount} 
          onChange={(e) => setTargetEmotionCount(Number(e.target.value))}
          style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--color-border)', borderRadius: '5px', fontSize: '1rem', cursor: 'pointer' }}
        >
          <option value={0} style={{color: 'black'}}>0 Emotions Attached</option>
          <option value={1} style={{color: 'black'}}>1 Emotion Attached</option>
          <option value={2} style={{color: 'black'}}>2 Emotions Attached</option>
          <option value={3} style={{color: 'black'}}>3 Emotions Attached</option>
        </select>
      </div>
    );
  }

  // To ensure the wheel is fully visible at initialization, we can provide a static bounding box 
  // to the graphData, or let the zoomToFit handle it. zoomToFit usually relies on node positions.
  // Since the wheel is drawn around (0,0) with radius 460, we should add some invisible dummy nodes 
  // so zoomToFit knows the true extent of the graph.
  const boundsNodes = [
    { id: 'b1', isBounds: true, x: 460, y: 460, fx: 460, fy: 460, color: 'transparent' },
    { id: 'b2', isBounds: true, x: -460, y: -460, fx: -460, fy: -460, color: 'transparent' }
  ];

  const fullGraphData = {
    nodes: [...graphData.nodes, ...boundsNodes],
    links: []
  };

  return (
    <div style={{ height: '70vh', width: '100%', position: 'relative', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', backdropFilter: 'blur(10px)' }}>
        <h3 style={{ color: 'var(--color-text)', margin: '0 0 0.5rem 0' }}>Quick Sort Wheel</h3>
        <select 
          value={targetEmotionCount} 
          onChange={(e) => setTargetEmotionCount(Number(e.target.value))}
          style={{ marginBottom: '0.8rem', width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--color-border)', borderRadius: '5px', cursor: 'pointer' }}
        >
          <option value={0} style={{color: 'black'}}>0 Emotions Attached</option>
          <option value={1} style={{color: 'black'}}>1 Emotion Attached</option>
          <option value={2} style={{color: 'black'}}>2 Emotions Attached</option>
          <option value={3} style={{color: 'black'}}>3 Emotions Attached</option>
        </select>
        <p style={{ color: 'var(--color-primary)', margin: 0, fontWeight: 'bold' }}>{unsorted.length} memories remaining</p>
        <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Drag to classify exactly how this feels.</p>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={fullGraphData}
        nodeCanvasObject={(node, ctx, globalScale) => {
          if (node.isBounds) return; // Invisible bounds nodes
          nodeCanvasObject(node, ctx, globalScale);
        }}
        nodeRelSize={45}
        enableNodeDrag={true}
        enableZoomPanInteraction={true} 
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        d3AlphaDecay={0.05}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}
