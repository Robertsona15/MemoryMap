import { useRef, useEffect, useState, useMemo } from 'react';
import { forceX, forceY } from 'd3-force';
import ForceGraph2D from 'react-force-graph-2d';
import { emotions } from '../data/schema';
import { getMemoryTargetCoordinate } from '../utils/math';
import { getFileUrlFromHandle } from '../utils/storage';

export default function NeuralNetworkMap({ memories, onNodeClick }) {
  const fgRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [images, setImages] = useState({});
  const [expandedStacks, setExpandedStacks] = useState(new Set());

  useEffect(() => {
    let active = true;
    async function loadImages() {
      if (!memories) return;
      const newImages = { ...images };
      for (const mem of memories) {
        if (!newImages[mem.id] && mem.fileHandle) {
          try {
             const url = await getFileUrlFromHandle(mem.fileHandle);
             const img = new Image();
             img.src = url;
             newImages[mem.id] = img;
          } catch (e) {
             console.error("Failed to load image for graph", e);
          }
        }
      }
      if (active) setImages(newImages);
    }
    loadImages();
    return () => { active = false; };
  }, [memories]);

  useEffect(() => {
    const rawNodes = [];
    const hubNodes = [];
    const baseLinks = [];

    if (!memories) return;
    const mapMemories = memories.filter(m => m.emotions && m.emotions.length > 0);

    // 1. Build adjacency list for explicit grouping (Entity Name & GROUP: links)
    const adj = {};
    mapMemories.forEach(m => { adj[m.id] = new Set(); });
    
    for (let i = 0; i < mapMemories.length; i++) {
      for (let j = i + 1; j < mapMemories.length; j++) {
        const m1 = mapMemories[i];
        const m2 = mapMemories[j];
        const adv1 = m1.advancedDetails || {};
        const adv2 = m2.advancedDetails || {};
        
        const hasExplicitLink = (adv1.linkedMemories || []).includes(m2.id) || (adv2.linkedMemories || []).includes(m1.id);
        const m2IsGroupOf1 = adv2.entityName && (adv1.linkedMemories || []).includes(`GROUP:${adv2.entityName.trim()}`);
        const m1IsGroupOf2 = adv1.entityName && (adv2.linkedMemories || []).includes(`GROUP:${adv1.entityName.trim()}`);
        const hasGroupExplicitLink = m2IsGroupOf1 || m1IsGroupOf2;
        const hasSharedEntity = adv1.entityName && adv2.entityName && adv1.entityName.trim().toLowerCase() === adv2.entityName.trim().toLowerCase();
        
        if (hasExplicitLink || hasGroupExplicitLink || hasSharedEntity) {
          adj[m1.id].add(m2.id);
          adj[m2.id].add(m1.id);
        }
      }
    }

    const visited = new Set();
    const groups = [];
    mapMemories.forEach(m => {
      if (!visited.has(m.id)) {
        const group = [];
        const queue = [m.id];
        visited.add(m.id);
        while(queue.length > 0) {
          const curr = queue.shift();
          group.push(mapMemories.find(mem => mem.id === curr));
          for (const neighbor of adj[curr]) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        groups.push(group);
      }
    });

    // 3. Process groups to create Hubs, Memory Nodes, and Spoke Links
    groups.forEach(group => {
      // First, ALWAYS generate raw Memory Nodes for every memory in the group
      group.forEach(mem => {
        let primaryColor = '#C8B6E2';
        if (mem.emotions && mem.emotions.length > 0 && emotions[mem.emotions[0]]) {
          primaryColor = emotions[mem.emotions[0]].color;
        }
        const targetCoord = getMemoryTargetCoordinate(mem.emotions);
        
        rawNodes.push({
          id: mem.id,
          name: mem.fileName,
          val: 1.5,
          color: primaryColor,
          memory: mem,
          emotions: mem.emotions || [],
          category: mem.category,
          subCategoryData: mem.subCategoryData || {},
          targetX: targetCoord.x,
          targetY: targetCoord.y,
          isCluster: false,
          isHub: false
        });
      });

      if (group.length > 1) {
        // Sub-cluster the group based on emotional distance (150px threshold)
        const coords = group.map(m => getMemoryTargetCoordinate(m.emotions));
        const subAdj = Array(group.length).fill(0).map(() => []);
        
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const dx = coords[i].x - coords[j].x;
            const dy = coords[i].y - coords[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist <= 150) { 
              subAdj[i].push(j);
              subAdj[j].push(i);
            }
          }
        }

        const subVisited = new Set();
        const subGroups = [];
        for (let i = 0; i < group.length; i++) {
          if (!subVisited.has(i)) {
            const subGroup = [];
            const queue = [i];
            subVisited.add(i);
            while (queue.length > 0) {
              const curr = queue.shift();
              subGroup.push(group[curr]);
              for (const neighbor of subAdj[curr]) {
                if (!subVisited.has(neighbor)) {
                  subVisited.add(neighbor);
                  queue.push(neighbor);
                }
              }
            }
            subGroups.push(subGroup);
          }
        }

        const subHubs = [];
        subGroups.forEach((sub, subIdx) => {
          if (sub.length > 1) {
            // Generate Black Hole Hub node
            const subCoords = sub.map(m => getMemoryTargetCoordinate(m.emotions));
            let sumX = 0, sumY = 0;
            subCoords.forEach(c => { sumX += c.x; sumY += c.y; });
            const targetX = sumX / subCoords.length;
            const targetY = sumY / subCoords.length;

            let coverMem = sub.find(m => m.advancedDetails?.isEntityCover) || sub[0];
            let primaryColor = '#C8B6E2';
            if (coverMem.emotions && coverMem.emotions.length > 0 && emotions[coverMem.emotions[0]]) {
              primaryColor = emotions[coverMem.emotions[0]].color;
            }
            
            const hubId = 'hub_' + coverMem.id + '_' + subIdx;
            const hubNode = {
              id: hubId,
              name: (coverMem.advancedDetails?.entityName || 'Entity Hub') + ` (${sub.length} memories)`,
              val: 4,
              color: primaryColor,
              isCluster: true, // Uses Canvas Image renderer
              coverImageId: coverMem.id,
              targetX,
              targetY,
              isHub: true
            };
            hubNodes.push(hubNode);
            subHubs.push(hubNode);

            // Create Spoke Links from each memory in this subGroup to its Hub
            sub.forEach(mem => {
               let mColor = '#C8B6E2';
               if (mem.emotions && mem.emotions.length > 0 && emotions[mem.emotions[0]]) {
                 mColor = emotions[mem.emotions[0]].color;
               }
               baseLinks.push({
                 source: mem.id, 
                 target: hubId,
                 value: 200, // Strong gravity to orbit hub
                 isSpoke: true,
                 spokeColor: mColor
               });
            });
          }
        });

        // Link fractured Hubs together with Gradients!
        for (let i = 0; i < subHubs.length; i++) {
          for (let j = i + 1; j < subHubs.length; j++) {
            baseLinks.push({
              source: subHubs[i].id,
              target: subHubs[j].id,
              value: 100, // Medium gravity to keep hubs near each other
              isFractureLink: true,
              colorA: subHubs[i].color,
              colorB: subHubs[j].color
            });
          }
        }
      }
    });

    // 4. Memory Stacking Logic
    const finalNodes = [...hubNodes]; 
    const coordMap = {};
    rawNodes.forEach(node => {
      const key = `${node.targetX.toFixed(1)},${node.targetY.toFixed(1)}`;
      if (!coordMap[key]) coordMap[key] = [];
      coordMap[key].push(node);
    });

    const idToStackMap = {};

    Object.keys(coordMap).forEach(key => {
      const stack = coordMap[key];
      if (stack.length === 1) {
        finalNodes.push(stack[0]);
        idToStackMap[stack[0].id] = stack[0].id;
      } else {
        const stackId = 'stack_' + stack[0].id; 
        stack.forEach(memNode => { idToStackMap[memNode.id] = stackId; });

        if (expandedStacks.has(stackId)) {
          // Burst them apart in a tight circle
          const radius = 25;
          stack.forEach((node, idx) => {
            const angle = (idx / stack.length) * 2 * Math.PI;
            // Shift their physics targets slightly so they stay apart
            node.targetX += Math.cos(angle) * radius;
            node.targetY += Math.sin(angle) * radius;
            finalNodes.push(node);
            idToStackMap[node.id] = node.id; // Un-mapped since they burst
          });
        } else {
          // Single Stack Point Node
          finalNodes.push({
            id: stackId,
            name: `${stack.length} Memories (Click to Split)`,
            val: 2.5,
            color: stack[0].color,
            isStack: true,
            targetX: stack[0].targetX,
            targetY: stack[0].targetY,
            stackedMemories: stack,
            memory: stack[0].memory // representative memory
          });
        }
      }
    });

    // Redirect links to point to Stack IDs if stacked
    const redirectedLinks = baseLinks.map(link => ({
      ...link,
      source: idToStackMap[link.source] || link.source,
      target: idToStackMap[link.target] || link.target
    }));

    // 5. Cross-Entity Relationship Links
    // Iterate over final nodes (excluding hubs and stacks) to calculate relational gravity
    for (let i = 0; i < rawNodes.length; i++) {
      for (let j = i + 1; j < rawNodes.length; j++) {
        let weight = 0;
        const n1 = rawNodes[i];
        const n2 = rawNodes[j];
        
        if (n1.category && n1.category === n2.category) weight += 1;
        const sharedEmotions = (n1.emotions || []).filter(e => (n2.emotions || []).includes(e));
        weight += sharedEmotions.length * 0.5;

        const advI = n1.memory?.advancedDetails || {};
        const advJ = n2.memory?.advancedDetails || {};

        let entityRelIntensity = 0;
        let hasEntityRel = false;

        if (advI.entityName && advJ.entityName) {
          const entityIName = advI.entityName.trim().toLowerCase();
          const entityJName = advJ.entityName.trim().toLowerCase();
          const relIJ = (advI.entityRelationships || []).find(r => r.targetEntity.trim().toLowerCase() === entityJName);
          const relJI = (advJ.entityRelationships || []).find(r => r.targetEntity.trim().toLowerCase() === entityIName);

          if (relIJ || relJI) {
            hasEntityRel = true;
            if (relIJ && relJI) {
              entityRelIntensity = (relIJ.intensity + relJI.intensity) / 2;
            } else {
              entityRelIntensity = relIJ ? relIJ.intensity : relJI.intensity;
            }
          }
        }

        if (weight > 0 && hasEntityRel) {
          weight *= (entityRelIntensity || 1);
        }

        // If these memories are not already linked via Hub, create a weak general link
        if (weight > 0) {
          // Use redirected IDs so it targets the Stack if necessary
          const srcId = idToStackMap[n1.id] || n1.id;
          const tgtId = idToStackMap[n2.id] || n2.id;
          // Prevent self-linking (e.g. if they are both in the same stack)
          if (srcId !== tgtId) {
            // Check if link already exists (from spokes etc)
            const exists = redirectedLinks.some(l => (l.source === srcId && l.target === tgtId) || (l.source === tgtId && l.target === srcId));
            if (!exists) {
              redirectedLinks.push({ source: srcId, target: tgtId, value: weight });
            }
          }
        }
      }
    }
    
    setGraphData({ nodes: finalNodes, links: redirectedLinks });
  }, [memories, expandedStacks]);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('link').distance(link => {
        return 100 / (link.value || 1);
      });
      fgRef.current.d3Force('charge').strength(-150);
      fgRef.current.d3Force('x', forceX(node => node.targetX || 0).strength(0.4));
      fgRef.current.d3Force('y', forceY(node => node.targetY || 0).strength(0.4));
    }
  }, [graphData]);

  const nodeCanvasObject = (node, ctx, globalScale) => {
    let size = node.isCluster ? 14 : (node.isStack ? 8 : 6);
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.shadowBlur = node.isStack ? 20 : 15;
    ctx.shadowColor = node.color || '#C8B6E2';
    ctx.fillStyle = node.color || '#C8B6E2';
    ctx.fill();
    ctx.shadowBlur = 0;

    if (node.isStack) {
      // Draw a tiny plus or indicator inside the stack
      ctx.fillStyle = '#000000';
      ctx.font = `${size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.stackedMemories.length, node.x, node.y);
    }
    
    if (node.isCluster && node.coverImageId && images[node.coverImageId]) {
      const img = images[node.coverImageId];
      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, node.x - size, node.y - size, size * 2, size * 2);
      ctx.restore();
    }
  };

  const linkCanvasObject = (link, ctx, globalScale) => {
    // Only custom draw Spoke Links or Fracture Links
    if (!link.isSpoke && !link.isFractureLink) return false; // fallback to default drawing for others

    const start = link.source;
    const end = link.target;
    
    // Safety check if physics hasn't initialized coordinates yet
    if (typeof start.x !== 'number' || typeof end.x !== 'number') return;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    
    if (link.isFractureLink) {
      // Linear gradient between fractured hubs
      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      grad.addColorStop(0, link.colorA || '#FFFFFF');
      grad.addColorStop(1, link.colorB || '#FFFFFF');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3 / globalScale;
    } else if (link.isSpoke) {
      // Solid color matching the memory dot
      ctx.strokeStyle = link.spokeColor;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.5 / globalScale;
    }

    ctx.stroke();
    ctx.globalAlpha = 1;
    return true; // We handled the drawing
  };

  const handleNodeClick = (node) => {
    if (node.isStack) {
      // Burst the stack!
      setExpandedStacks(prev => {
        const next = new Set(prev);
        next.add(node.id);
        return next;
      });
    } else if (node.isHub) {
      // Do nothing, hubs just represent groups
    } else {
      // Standard memory node
      onNodeClick(node.memory);
    }
  };

  if (!memories || memories.length === 0) {
    return (
      <div className="glass-panel" style={{ width: '100%', height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Add memories to construct your neural network.</p>
      </div>
    );
  }

  return (
    <div style={{ height: '70vh', width: '100%', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="name"
        nodeColor="color"
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        linkColor={() => 'rgba(200, 182, 226, 0.1)'} // Very faint default links
        linkOpacity={0.1}
      />
    </div>
  );
}
