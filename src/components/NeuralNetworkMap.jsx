import { useRef, useEffect, useState, useMemo } from 'react';
import { forceX, forceY } from 'd3-force';
import ForceGraph2D from 'react-force-graph-2d';
import { emotions } from '../data/schema';
import { getMemoryTargetCoordinate } from '../utils/math';

export default function NeuralNetworkMap({ memories, onNodeClick }) {
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    // Basic responsive sizing for the container
    const updateDimensions = () => {
      const container = document.getElementById('map-container');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];

    // Map each memory to a node
    memories.forEach(mem => {
      // Find the primary emotion color (just use the first selected emotion for coloring)
      let primaryColor = '#FFFFFF'; // default
      if (mem.emotions && mem.emotions.length > 0) {
        const mainEmotionKey = mem.emotions[0];
        if (emotions[mainEmotionKey]) {
          primaryColor = emotions[mainEmotionKey].color;
        }
      }

      // Compute target plotting coordinate based on emotion vectors
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
        targetY: targetCoord.y
      });
    });

    // Create links between nodes based on shared characteristics
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        let linkWeight = 0;
        let reasons = [];

        // 1. Primary Gravity: Shared emotions
        const sharedEmotions = nodeA.emotions.filter(e => nodeB.emotions.includes(e));
        if (sharedEmotions.length > 0) {
          linkWeight += sharedEmotions.length * 2;
          reasons.push('shared emotion');
        }

        // 2. Secondary Gravity: Related Details
        if (nodeA.category && nodeA.category === nodeB.category) {
          // Both are same category (e.g. 'person')
          linkWeight += 1;
          
          if (nodeA.category === 'person') {
            if (nodeA.subCategoryData.relationship && nodeA.subCategoryData.relationship === nodeB.subCategoryData.relationship) {
              linkWeight += 3;
              reasons.push('same relationship');
            }
          } else {
            // Place, object, concept, pet
            if (nodeA.subCategoryData.characteristics && 
                nodeA.subCategoryData.characteristics.toLowerCase() === nodeB.subCategoryData.characteristics?.toLowerCase()) {
              linkWeight += 3;
              reasons.push('same details');
            }
          }
        }

        // Shared location metadata
        if (nodeA.memory.metadata?.locationStr && 
            nodeA.memory.metadata?.locationStr === nodeB.memory.metadata?.locationStr) {
          linkWeight += 3;
          reasons.push('same location');
        }

        if (linkWeight > 0) {
          links.push({
            source: nodeA.id,
            target: nodeB.id,
            value: linkWeight,
            reasons: reasons.join(', ')
          });
        }
      }
    }

    return { nodes, links };
  }, [memories]);

  useEffect(() => {
    // Apply custom forces based on emotion coordinates and relationship links
    if (fgRef.current) {
      fgRef.current.d3Force('link').distance(link => {
        // Stronger connections (higher value) = shorter distance
        return 100 / (link.value || 1);
      });
      fgRef.current.d3Force('charge').strength(-150); // Repel nodes slightly

      // Apply gravitational pull towards the emotion-based target coordinates
      fgRef.current.d3Force('x', forceX(node => node.targetX || 0).strength(0.3));
      fgRef.current.d3Force('y', forceY(node => node.targetY || 0).strength(0.3));
    }
  }, [graphData]);

  if (!memories || memories.length === 0) {
    return (
      <div id="map-container" className="glass-panel" style={{ width: '100%', height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Add memories to construct your neural network.</p>
      </div>
    );
  }

  return (
    <div id="map-container" className="glass-panel glow-hover" style={{ width: '100%', height: '400px', overflow: 'hidden' }}>
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeLabel="name"
        nodeColor="color"
        nodeRelSize={6}
        linkColor={() => 'rgba(138, 43, 226, 0.4)'}
        linkWidth={link => Math.min(link.value, 4)} // thicker lines for stronger connections
        onNodeClick={(node) => onNodeClick && onNodeClick(node.memory)}
        backgroundColor="transparent"
      />
    </div>
  );
}
