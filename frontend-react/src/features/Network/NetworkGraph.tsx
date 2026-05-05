import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

interface NetworkGraphProps {
  nodes: any[];
  edges: any[];
  onSelectNode?: (authorId: string) => void;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ nodes, edges, onSelectNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const visNodes = new DataSet(nodes.map(n => ({
      id: n.id,
      label: n.label,
      group: n.group,
      value: n.value,
      title: `ID: ${n.id}\nAffiliation: ${n.group}`,
    })));

    const visEdges = new DataSet(edges.map(e => ({
      from: e.from,
      to: e.to,
      width: e.width,
      color: { color: 'rgba(88, 166, 255, 0.4)' },
    })));

    const options = {
      nodes: {
        shape: 'dot',
        font: {
          size: 12,
          color: '#c9d1d9',
        },
        borderWidth: 2,
        shadow: true,
      },
      edges: {
        smooth: {
          type: 'continuous',
        },
        shadow: true,
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -100,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08,
        },
        stabilization: {
          iterations: 150,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        navigationButtons: true,
        keyboard: true,
      },
    };

    const network = new Network(containerRef.current, { nodes: visNodes, edges: visEdges }, options);
    networkRef.current = network;

    network.on('selectNode', (params) => {
      if (params.nodes.length > 0 && onSelectNode) {
        onSelectNode(params.nodes[0]);
      }
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [nodes, edges]);

  return (
    <div ref={containerRef} className="w-full h-full bg-bg-dark/50 rounded-2xl" />
  );
};

export default NetworkGraph;
