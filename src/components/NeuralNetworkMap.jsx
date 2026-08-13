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

  // Asynchronously load images for canvas rendering
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

  // Rebuild graph nodes and links whenever memories array changes
  useEffect(() => {
    const nodes = [];
    const links = [];

    // 1. Build adjacency list for explicit grouping (Black Hole links)
    const adj = {};
    memories.forEach(m => { adj[m.id] = new Set(); });
    
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const m1 = memories[i];
        const m2 = memories[j];
        const adv1 = m1.advancedDetails || {};
        const adv2 = m2.advancedDetails || {};
        
        const hasExplicitLink = (adv1.linkedMemories || []).includes(m2.id) || (adv2.linkedMemories || []).includes(m1.id);
        const hasSharedEntity = adv1.entityName && adv2.entityName && adv1.entityName.trim().toLowerCase() === adv2.entityName.trim().toLowerCase();
        
        if (hasExplicitLink || hasSharedEntity) {
          adj[m1.id].add(m2.id);
          adj[m2.id].add(m1.id);
        }
      }
    }

    // 2. Find connected components (groups)
    const visited = new Set();
    const groups = [];
    memories.forEach(m => {
      if (!visited.has(m.id)) {
        const group = [];
        const queue = [m.id];
        visited.add(m.id);
        while(queue.length > 0) {
          const curr = queue.shift();
          group.push(memories.find(mem => mem.id === curr));
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

    // 3. Process groups to create Nodes (and merge into Black Holes if close)
    groups.forEach(group => {
      if (group.length === 1) {
        // Ungrouped memory
        const mem = group[0];
        let primaryColor = '#C8B6E2';
        if (mem.emotions && mem.emotions.length > 0) {
          const emKey = mem.emotions[0];
          if (emotions[emKey]) primaryColor = emotions[emKey].color;
        }
        const targetCoord = getMemoryTargetCoordinate(mem.emotions);
        
        nodes.push({
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
          isCluster: false
        });
      } else {
        // Grouped memories: Check if they are close enough to merge
        let maxDist = 0;
        const coords = group.map(m => getMemoryTargetCoordinate(m.emotions));
        
        for (let i = 0; i < coords.length; i++) {
          for (let j = i + 1; j < coords.length; j++) {
            const dx = coords[i].x - coords[j].x;
            const dy = coords[i].y - coords[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > maxDist) maxDist = dist;
          }
        }

        if (maxDist < 150) {
          // MERGE into a Black Hole
          let sumX = 0, sumY = 0;
          coords.forEach(c => { sumX += c.x; sumY += c.y; });
          const targetX = sumX / coords.length;
          const targetY = sumY / coords.length;

          let coverMem = group.find(m => m.advancedDetails?.isEntityCover) || group[0];
          let primaryColor = '#C8B6E2';
          if (coverMem.emotions && coverMem.emotions.length > 0 && emotions[coverMem.emotions[0]]) {
            primaryColor = emotions[coverMem.emotions[0]].color;
          }

          nodes.push({
            id: 'cluster_' + coverMem.id,
            name: (coverMem.advancedDetails?.entityName || 'Merged Group') + ` (${group.length} memories)`,
            val: 3,
            color: primaryColor,
            isCluster: true,
            coverImageId: coverMem.id,
            mergedMemories: group,
            targetX,
            targetY,
            emotions: coverMem.emotions || [],
            memory: coverMem
          });
        } else {
          group.forEach(mem => {
            let primaryColor = '#C8B6E2';
            if (mem.emotions && mem.emotions.length > 0 && emotions[mem.emotions[0]]) {
              primaryColor = emotions[mem.emotions[0]].color;
            }
            const targetCoord = getMemoryTargetCoordinate(mem.emotions);
            nodes.push({
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
              isCluster: false
            });
          });
        }
      }
    });

    // Create links between nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let weight = 0;
        const n1 = nodes[i];
        const n2 = nodes[j];
        
        if (n1.category && n1.category === n2.category) {
          weight += 1;
        }

        const sharedEmotions = (n1.emotions || []).filter(e => (n2.emotions || []).includes(e));
        weight += sharedEmotions.length * 0.5;

        const advI = n1.memory?.advancedDetails || {};
        const advJ = n2.memory?.advancedDetails || {};

        if (weight > 0) {
          const intensityI = advI.relationshipIntensity || 5;
          const intensityJ = advJ.relationshipIntensity || 5;
          weight *= ((intensityI + intensityJ) / 10);
        }

        const hasExplicitLink = (advI.linkedMemories || []).includes(n2.memory?.id) || (advJ.linkedMemories || []).includes(n1.memory?.id);
        const hasSharedEntity = advI.entityName && advJ.entityName && advI.entityName.trim().toLowerCase() === advJ.entityName.trim().toLowerCase();

        if (hasExplicitLink || hasSharedEntity) {
          weight += 100;
        }

        if (weight > 0) {
          links.push({ source: n1.id, target: n2.id, value: weight });
        }
      }
    }
    
    setGraphData({ nodes, links });
  }, [memories]);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('link').distance(link => {
        return 100 / (link.value || 1);
      });
      fgRef.current.d3Force('charge').strength(-150);
      fgRef.current.d3Force('x', forceX(node => node.targetX || 0).strength(0.3));
      fgRef.current.d3Force('y', forceY(node => node.targetY || 0).strength(0.3));
    }
  }, [graphData]);

  const nodeCanvasObject = (node, ctx, globalScale) => {
    const size = node.isCluster ? 12 : 6;
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.shadowBlur = 15;
    ctx.shadowColor = node.color || '#C8B6E2';
    ctx.fillStyle = node.color || '#C8B6E2';
    ctx.fill();
    ctx.shadowBlur = 0;
    
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

  const handleNodeClick = (node) => {
    onNodeClick(node.memory);
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
        onNodeClick={handleNodeClick}
        linkColor={() => 'rgba(200, 182, 226, 0.2)'}
        linkOpacity={0.2}
      />
    </div>
  );
}
