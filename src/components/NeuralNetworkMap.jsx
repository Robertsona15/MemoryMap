import { useRef, useEffect, useState, useMemo } from 'react';
import { forceX, forceY } from 'd3-force';
import ForceGraph2D from 'react-force-graph-2d';
import { emotions, memoryRelationships, relationshipIntensityDefaults } from '../data/schema';
import { getMemoryTargetCoordinate } from '../utils/math';
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

export default function NeuralNetworkMap({ memories, onNodeClick, onMemoryUpdated }) {
  const fgRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [images, setImages] = useState({});
  const [expandedStacks, setExpandedStacks] = useState(new Set());
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [connectSourceNode, setConnectSourceNode] = useState(null);
  const [connectTargetNode, setConnectTargetNode] = useState(null);
  
  const { minDate, maxDate } = useMemo(() => {
    let min = Date.now();
    let max = Date.now();
    let foundValid = false;
    
    memories.forEach(m => {
       const pDateStr = m.advancedDetails?.pastDate || m.metadata?.date;
       if (pDateStr) {
           const pDate = new Date(pDateStr).getTime();
           if (!isNaN(pDate)) {
             if (pDate < min) min = pDate;
             foundValid = true;
           }
       }
       
       const cDateStr = m.advancedDetails?.currentDate;
       if (cDateStr) {
           const cDate = new Date(cDateStr).getTime();
           if (!isNaN(cDate)) {
             if (cDate > max) max = cDate;
             foundValid = true;
           }
       }
    });

    if (!foundValid) {
      min = max - 31536000000;
    }
    return { minDate: min, maxDate: max };
  }, [memories]);
  
  const [timelineDate, setTimelineDate] = useState(maxDate);

  useEffect(() => {
    if (timelineDate < minDate || timelineDate > maxDate) {
      setTimelineDate(maxDate);
    }
  }, [minDate, maxDate]);

  useEffect(() => {
    let active = true;
    async function loadImages() {
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

    const mapMemories = memories.filter(m => 
      (m.emotions && m.emotions.length > 0) || 
      (m.advancedDetails && m.advancedDetails.pastEmotions && m.advancedDetails.pastEmotions.length > 0)
    ).filter(m => {
      const pDateStr = m.advancedDetails?.pastDate || m.metadata?.date;
      const pDate = pDateStr ? new Date(pDateStr).getTime() : null;
      if (pDate && timelineDate < pDate) return false;
      return true;
    });

    // 1. Build adjacency list for explicit grouping (Entity Name & GROUP: links)
    const adj = {};
    mapMemories.forEach(m => { adj[m.id] = new Set(); });
    
    for (let i = 0; i < mapMemories.length; i++) {
      for (let j = i + 1; j < mapMemories.length; j++) {
        const m1 = mapMemories[i];
        const m2 = mapMemories[j];
        const adv1 = m1.advancedDetails || {};
        const adv2 = m2.advancedDetails || {};
        
        const hasSharedEntity = adv1.entityName && adv2.entityName && adv1.entityName.trim().toLowerCase() === adv2.entityName.trim().toLowerCase();
        
        if (hasSharedEntity) {
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
      const isSolo = group.length === 1;

      group.forEach(mem => {
        const pDateStr = mem.advancedDetails?.pastDate || mem.metadata?.date;
        const pDate = pDateStr ? new Date(pDateStr).getTime() : null;
        
        const cDateStr = mem.advancedDetails?.currentDate;
        const cDate = cDateStr ? new Date(cDateStr).getTime() : Date.now();

        let t = 1;
        if (pDate && mem.advancedDetails?.pastEmotions?.length > 0 && mem.emotions?.length > 0) {
           if (cDate > pDate) {
              t = Math.max(0, Math.min(1, (timelineDate - pDate) / (cDate - pDate)));
           } else {
              t = 1;
           }
        }

        let currentColors = [];
        let currentCoord = null;
        if (mem.emotions && mem.emotions.length > 0) {
          currentColors = mem.emotions.slice(0, 3).map(e => emotions[e] ? emotions[e].color : '#C8B6E2');
          currentCoord = getMemoryTargetCoordinate(mem.emotions);
        } else {
          currentColors = ['#C8B6E2'];
        }
        
        const pastEmotions = mem.advancedDetails?.pastEmotions || [];
        let pastColors = [];
        let pastCoord = null;
        if (pastEmotions.length > 0) {
          pastColors = pastEmotions.slice(0, 3).map(e => emotions[e] ? emotions[e].color : '#FFFFFF');
          pastCoord = getMemoryTargetCoordinate(pastEmotions);
        } else {
          pastColors = ['#FFFFFF'];
        }
        
        if (!currentCoord && !pastCoord) currentCoord = { x: 0, y: 0 };
        
        let finalColors = [];
        const count = Math.max(currentColors.length, pastColors.length);
        for (let i = 0; i < count; i++) {
          const cCol = currentColors[i] || currentColors[0];
          const pCol = pastColors[i] || pastColors[0];
          
          if (pastEmotions.length > 0 && mem.emotions && mem.emotions.length > 0) {
            finalColors.push(interpolateColor(pCol, cCol, t));
          } else if (pastEmotions.length > 0) {
            finalColors.push(pCol);
          } else {
            finalColors.push(cCol);
          }
        }
        
        const finalPastCoord = pastCoord || currentCoord;
        const finalCurrentCoord = currentCoord || pastCoord;
        
        const targetX = finalPastCoord.x + (finalCurrentCoord.x - finalPastCoord.x) * t;
        const targetY = finalPastCoord.y + (finalCurrentCoord.y - finalPastCoord.y) * t;

        rawNodes.push({
          id: mem.id,
          name: mem.fileName,
          val: 1.5,
          color: finalColors[0],
          colors: finalColors,
          memory: mem,
          emotions: mem.emotions || [],
          category: mem.category,
          subCategoryData: mem.subCategoryData || {},
          targetX: targetX,
          targetY: targetY,
          isCluster: false,
          isHub: false,
          isSolo: isSolo
        });
      });

      if (group.length > 1) {
        // Sub-cluster the group based on dynamic interpolated coordinates (150px threshold)
        const coords = group.map(m => {
          const node = rawNodes.find(n => n.id === m.id);
          return { x: node ? node.targetX : 0, y: node ? node.targetY : 0 };
        });
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
            // Generate Black Hole Hub node dynamically tracking the shifting memories
            const subCoords = sub.map(m => {
              const node = rawNodes.find(n => n.id === m.id);
              return { x: node ? node.targetX : 0, y: node ? node.targetY : 0 };
            });
            let sumX = 0, sumY = 0;
            subCoords.forEach(c => { sumX += c.x; sumY += c.y; });
            const targetX = sumX / subCoords.length;
            const targetY = sumY / subCoords.length;

            let coverMem = sub.find(m => m.advancedDetails?.isEntityCover) || sub[0];
            const coverNode = rawNodes.find(n => n.id === coverMem.id);
            const hubColor = coverNode ? coverNode.color : '#C8B6E2';
            
            const hubId = 'hub_' + coverMem.id + '_' + subIdx;
            const hubNode = {
              id: hubId,
              name: (coverMem.advancedDetails?.entityName || 'Entity Hub') + ` (${sub.length} memories)`,
              val: 4,
              color: hubColor,
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
               baseLinks.push({
                 source: mem.id, 
                 target: hubId,
                 value: 400, // Very strong gravity to orbit hub tightly
                 isSpoke: true
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
              isFractureLink: true
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
        const n1 = rawNodes[i];
        const n2 = rawNodes[j];
        
        const advI = n1.memory?.advancedDetails || {};
        const advJ = n2.memory?.advancedDetails || {};
        const metaI = n1.memory?.metadata || {};
        const metaJ = n2.memory?.metadata || {};

        let isLinked = false;
        let weight = 0;
        let isExplicit = false;

        // Condition 1: Entities are related
        if (advI.entityName && advJ.entityName) {
          const entityIName = advI.entityName.trim().toLowerCase();
          const entityJName = advJ.entityName.trim().toLowerCase();
          const relIJ = (advI.entityRelationships || []).find(r => r.targetEntity.trim().toLowerCase() === entityJName);
          const relJI = (advJ.entityRelationships || []).find(r => r.targetEntity.trim().toLowerCase() === entityIName);

          if (relIJ || relJI) {
            isLinked = true;
            if (relIJ && relJI) {
              weight = (relIJ.intensity + relJI.intensity) / 2;
            } else {
              weight = relIJ ? relIJ.intensity : relJI.intensity;
            }
          }
        }

        // Condition 2: Share exact same physical location
        if (!isLinked && metaI.locationStr && metaJ.locationStr && metaI.locationStr === metaJ.locationStr) {
          isLinked = true;
          weight = 50; // default weight for location
        }

        // Condition 3: Explicitly user-linked memories
        const customLinksI = advI.customLinks || [];
        const customLinksJ = advJ.customLinks || [];
        const linkIJ = customLinksI.find(l => l.targetId === n2.id);
        const linkJI = customLinksJ.find(l => l.targetId === n1.id);

        if (!isLinked && (linkIJ || linkJI)) {
          isLinked = true;
          weight = linkIJ ? linkIJ.intensity : linkJI.intensity;
          isExplicit = true;
        }

        if (isLinked) {
          // Use redirected IDs so it targets the Stack if necessary
          const srcId = idToStackMap[n1.id] || n1.id;
          const tgtId = idToStackMap[n2.id] || n2.id;
          // Prevent self-linking (e.g. if they are both in the same stack)
          if (srcId !== tgtId) {
            // Check if link already exists (from spokes etc)
            const exists = redirectedLinks.some(l => (l.source === srcId && l.target === tgtId) || (l.source === tgtId && l.target === srcId));
            if (!exists) {
              redirectedLinks.push({ source: srcId, target: tgtId, value: weight, isExplicitLink: isExplicit });
            }
          }
        }
      }
    }
    
    setGraphData({ nodes: finalNodes, links: redirectedLinks });
  }, [memories, expandedStacks, timelineDate, maxDate]);

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
    if (typeof node.x !== 'number' || typeof node.y !== 'number') return;
    
    let size = node.isCluster ? 14 : (node.isStack ? 8 : (node.isSolo ? 10 : 6));

    // Performance Optimization: Skip shadowBlur if there are many nodes or if we are zoomed out far
    const skipShadows = globalScale < 0.5 || graphData.nodes.length > 100;

    if (node.isSolo && images[node.memory?.id]) {
      // Draw solo memory image!
      const img = images[node.memory.id];
      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2, true);
      ctx.closePath();
      
      // Draw color border
      if (!skipShadows) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = node.color || '#FFFFFF';
      }
      ctx.lineWidth = 2 / globalScale;
      ctx.strokeStyle = node.color || '#C8B6E2';
      ctx.stroke();
      if (!skipShadows) ctx.shadowBlur = 0;

      ctx.clip();
      ctx.drawImage(img, node.x - size, node.y - size, size * 2, size * 2);
      ctx.restore();

    } else if (node.isCluster && node.coverImageId && images[node.coverImageId]) {
      const img = images[node.coverImageId];
      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2, true);
      ctx.closePath();
      
      if (!skipShadows) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = node.color || '#FFFFFF';
      }
      ctx.lineWidth = 3 / globalScale;
      ctx.strokeStyle = node.color || '#FFFFFF';
      ctx.stroke();
      if (!skipShadows) ctx.shadowBlur = 0;

      ctx.clip();
      ctx.drawImage(img, node.x - size, node.y - size, size * 2, size * 2);
      ctx.restore();
      
    } else if (!node.isCluster && !node.isStack && node.colors && node.colors.length > 1) {
      // Draw linear gradient for multi-color memories to match compound buttons
      const grad = ctx.createLinearGradient(
        node.x - size, node.y - size, 
        node.x + size, node.y + size
      );
      
      const step = 1 / (node.colors.length - 1);
      node.colors.forEach((color, i) => {
        grad.addColorStop(i * step, color);
      });
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
      
      if (!skipShadows) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = node.colors[0];
      }
      ctx.fillStyle = grad;
      ctx.fill();
      if (!skipShadows) ctx.shadowBlur = 0;
      
      // Draw white outline
      ctx.lineWidth = 1 / globalScale;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.stroke();

    } else {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
      if (!skipShadows) {
        ctx.shadowBlur = node.isStack ? 15 : 10;
        ctx.shadowColor = node.color || '#C8B6E2';
      }
      ctx.fillStyle = node.color || '#C8B6E2';
      ctx.fill();
      if (!skipShadows) ctx.shadowBlur = 0;
    }

    if (isConnectMode && connectSourceNode && connectSourceNode.id === node.id) {
      // Draw glowing selection ring around the source node!
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 8, 0, 2 * Math.PI);
      ctx.strokeStyle = 'var(--color-secondary)';
      ctx.lineWidth = 3 / globalScale;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'var(--color-secondary)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (node.isStack) {
      // Draw a tiny plus or indicator inside the stack
      ctx.fillStyle = '#000000';
      ctx.font = `${size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.stackedMemories.length, node.x, node.y);
    }
  };

  const linkCanvasObject = (link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;
    
    // Safety check if physics hasn't initialized coordinates yet
    if (typeof start.x !== 'number' || typeof end.x !== 'number') return;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    
    if (link.isFractureLink) {
      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      grad.addColorStop(0, start.color || '#FFFFFF');
      grad.addColorStop(1, end.color || '#FFFFFF');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3 / globalScale;
    } else if (link.isExplicitLink) {
      // Draw explicit link as solid line with varying opacity/thickness based on weight
      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      grad.addColorStop(0, start.color || '#FFFFFF');
      grad.addColorStop(1, end.color || '#FFFFFF');
      ctx.strokeStyle = grad;
      ctx.globalAlpha = Math.min(1.0, 0.1 + (link.value * 0.005)); 
      ctx.lineWidth = Math.min(3.5, 1 + (link.value * 0.015)) / globalScale;
    } else if (link.isSpoke) {
      // Spoke links connect a memory to a hub - most intense connection
      ctx.strokeStyle = start.color || '#FFFFFF';
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 3 / globalScale;
    } else {
      // General links (Location, Explicit User Link, Entity Link)
      // Visability scales significantly based on the link's weight (details shared)
      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      grad.addColorStop(0, start.color || '#FFFFFF');
      grad.addColorStop(1, end.color || '#FFFFFF');
      ctx.strokeStyle = grad;
      // Weight drives the alpha. 
      // Base link starts faint, heavily weighted links approach opaque.
      ctx.globalAlpha = Math.min(1.0, 0.05 + (link.value * 0.005));
      ctx.lineWidth = 1.5 / globalScale;
    }

    ctx.stroke();
    ctx.globalAlpha = 1;
    return true; // We handled all drawing
  };

  // Removed obsolete drag handlers

  const handleNodeClick = (node) => {
    if (isConnectMode && !node.isCluster && !node.isStack) {
      if (!connectSourceNode) {
        setConnectSourceNode(node);
      } else if (connectSourceNode.id !== node.id) {
        setConnectTargetNode(node);
      }
      return;
    }
    
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

  // Sub-component for Connection Modal
  const ConnectionModal = () => {
    const mem1 = connectSourceNode?.memory;
    const mem2 = connectTargetNode?.memory;
    const cat1 = mem1?.category || 'default';
    const cat2 = mem2?.category || 'default';
    const suggestions = memoryRelationships[`${cat1}_${cat2}`] || memoryRelationships[`${cat2}_${cat1}`] || memoryRelationships.default;
    const groupKeys = Object.keys(suggestions);

    const [selectedGroup, setSelectedGroup] = useState(groupKeys[0]);
    const [label, setLabel] = useState(suggestions[groupKeys[0]][0] || 'Related To');
    const [customLabel, setCustomLabel] = useState('');
    
    const existingLinkIdx1 = (mem1?.advancedDetails?.customLinks || []).findIndex(l => l.targetId === mem2?.id);
    const existingLinkIdx2 = (mem2?.advancedDetails?.customLinks || []).findIndex(l => l.targetId === mem1?.id);
    const isLinked = existingLinkIdx1 >= 0 || existingLinkIdx2 >= 0;

    let defaultIntensity = relationshipIntensityDefaults[suggestions[groupKeys[0]][0]] || 50;
    if (existingLinkIdx1 >= 0 && mem1) defaultIntensity = mem1.advancedDetails.customLinks[existingLinkIdx1].intensity;
    else if (existingLinkIdx2 >= 0 && mem2) defaultIntensity = mem2.advancedDetails.customLinks[existingLinkIdx2].intensity;

    const [intensity, setIntensity] = useState(defaultIntensity);

    if (!connectSourceNode || !connectTargetNode) return null;

    const handleGroupChange = (g) => {
      setSelectedGroup(g);
      const firstRel = suggestions[g][0];
      setLabel(firstRel);
      setCustomLabel('');
      if (!isLinked) {
        setIntensity(relationshipIntensityDefaults[firstRel] || 50);
      }
    };

    const handleSave = async () => {
      const finalLabel = customLabel.trim() || label;
      
      const newAdv1 = mem1.advancedDetails || {};
      const newLinks1 = [...(newAdv1.customLinks || [])];
      if (existingLinkIdx1 >= 0) newLinks1.splice(existingLinkIdx1, 1);
      newLinks1.push({ targetId: mem2.id, label: finalLabel, intensity });
      const updatedMem1 = { ...mem1, advancedDetails: { ...newAdv1, customLinks: newLinks1 } };
      
      const newAdv2 = mem2.advancedDetails || {};
      const newLinks2 = [...(newAdv2.customLinks || [])];
      if (existingLinkIdx2 >= 0) newLinks2.splice(existingLinkIdx2, 1);
      const updatedMem2 = { ...mem2, advancedDetails: { ...newAdv2, customLinks: newLinks2 } };
      
      const saved1 = await saveMemory(updatedMem1);
      const saved2 = await saveMemory(updatedMem2);
      if (onMemoryUpdated) {
        onMemoryUpdated(saved1);
        onMemoryUpdated(saved2);
      }
      
      setConnectSourceNode(null);
      setConnectTargetNode(null);
    };

    const handleUnlink = async () => {
      const newAdv1 = mem1.advancedDetails || {};
      const newLinks1 = [...(newAdv1.customLinks || [])];
      if (existingLinkIdx1 >= 0) newLinks1.splice(existingLinkIdx1, 1);
      const updatedMem1 = { ...mem1, advancedDetails: { ...newAdv1, customLinks: newLinks1 } };
      
      const newAdv2 = mem2.advancedDetails || {};
      const newLinks2 = [...(newAdv2.customLinks || [])];
      if (existingLinkIdx2 >= 0) newLinks2.splice(existingLinkIdx2, 1);
      const updatedMem2 = { ...mem2, advancedDetails: { ...newAdv2, customLinks: newLinks2 } };
      
      const saved1 = await saveMemory(updatedMem1);
      const saved2 = await saveMemory(updatedMem2);
      if (onMemoryUpdated) {
        onMemoryUpdated(saved1);
        onMemoryUpdated(saved2);
      }
      
      setConnectSourceNode(null);
      setConnectTargetNode(null);
    };

    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel" style={{ width: '450px', padding: '2rem', background: 'rgba(20,20,30,0.9)', borderRadius: 'var(--radius)', border: '1px solid var(--color-primary)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--color-secondary)' }}>Connect Memories</h3>
          <p style={{ color: 'white', marginBottom: '1rem' }}>
            <strong>{mem1.fileName}</strong> <br/>
            <span style={{ color: 'var(--color-text-muted)' }}>— to —</span> <br/>
            <strong>{mem2.fileName}</strong>
          </p>

          <label style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Relationship Group</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {groupKeys.map(g => (
              <button 
                key={g} 
                onClick={() => handleGroupChange(g)}
                style={{
                  background: selectedGroup === g ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                  color: selectedGroup === g ? 'black' : 'white',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontWeight: selectedGroup === g ? 'bold' : 'normal'
                }}
              >
                {g}
              </button>
            ))}
          </div>

          <label style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Specific Relationship</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {suggestions[selectedGroup].map(s => (
              <button 
                key={s} 
                onClick={() => { 
                  setLabel(s); 
                  setCustomLabel(''); 
                  if (!isLinked) setIntensity(relationshipIntensityDefaults[s] || 50);
                }}
                style={{
                  background: label === s && !customLabel ? 'var(--color-secondary)' : 'rgba(255,255,255,0.1)',
                  color: label === s && !customLabel ? 'black' : 'white',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontWeight: label === s && !customLabel ? 'bold' : 'normal'
                }}
              >
                {s}
              </button>
            ))}
          </div>
          
          <input 
            type="text" 
            placeholder="Custom relationship..." 
            value={customLabel} 
            onChange={e => setCustomLabel(e.target.value)}
            style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--color-border)', borderRadius: '5px', marginBottom: '1.5rem' }}
          />

          <label style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Connection Intensity ({intensity})</label>
          <input 
            type="range" 
            min="10" max="200" 
            value={intensity} 
            onChange={e => setIntensity(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-secondary)', marginBottom: '2rem' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            {isLinked ? (
              <button onClick={handleUnlink} style={{ padding: '0.8rem 1.5rem', background: 'rgba(255, 0, 0, 0.2)', color: '#FF5252', border: '1px solid #FF5252', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Unlink Memories</button>
            ) : (
              <div></div> // spacer
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => { setConnectSourceNode(null); setConnectTargetNode(null); }} style={{ padding: '0.8rem 1.5rem', background: 'transparent', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '0.8rem 1.5rem', background: 'var(--color-secondary)', color: 'black', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Save Link</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '70vh', width: '100%', position: 'relative', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="name"
        nodeColor="color"
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        linkColor={() => 'rgba(200, 182, 226, 0.1)'} 
        linkOpacity={0.1}
      />

      <ConnectionModal />

      {/* Mode Toggle Button */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
        <button 
          onClick={() => {
            setIsConnectMode(!isConnectMode);
            setConnectSourceNode(null);
            setConnectTargetNode(null);
          }}
          style={{
            background: isConnectMode ? 'var(--color-primary)' : 'rgba(0,0,0,0.6)',
            color: 'white',
            border: `1px solid ${isConnectMode ? 'var(--color-secondary)' : 'var(--color-border)'}`,
            padding: '0.8rem 1.5rem',
            borderRadius: '20px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: isConnectMode ? '0 0 15px var(--color-glow)' : 'none',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          {isConnectMode ? '🔗 Connect Mode: ON' : '🔍 Navigate Mode'}
        </button>
        {isConnectMode && (
          <p style={{ color: 'white', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'right', textShadow: '0 0 5px black', fontWeight: 'bold' }}>
            Click a memory, then click<br/>another to link them.
          </p>
        )}
      </div>
      
      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        width: '80%',
        background: 'rgba(0,0,0,0.6)', 
        padding: '1rem 1.5rem', 
        borderRadius: 'var(--radius)', 
        backdropFilter: 'blur(10px)', 
        border: '1px solid var(--color-border)', 
        zIndex: 10 
      }}>
        <input 
          type="range" 
          min={minDate} 
          max={maxDate} 
          value={timelineDate} 
          onChange={(e) => setTimelineDate(Number(e.target.value))} 
          style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }} 
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
          <span>{new Date(minDate).toLocaleDateString()}</span>
          <span style={{ fontWeight: 'bold', color: 'var(--color-primary)', textShadow: '0 0 5px var(--color-glow)', fontSize: '1rem' }}>
            {new Date(timelineDate).toLocaleDateString()}
          </span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
