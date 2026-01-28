import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import * as d3 from 'd3'
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Refresh,
  FilterList,
} from '@mui/icons-material'
import { Button, Card, CardContent, Badge } from '../components/ui'
import { mindmapService } from '../services'
import type { MindMapData, MindMapNode, MindMapEdge } from '../types'

export default function MindMapPage() {
  const [data, setData] = useState<MindMapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMindMap()
  }, [])

  useEffect(() => {
    if (data && svgRef.current && containerRef.current) {
      renderGraph()
    }
  }, [data])

  const loadMindMap = async () => {
    setIsLoading(true)
    try {
      const mapData = await mindmapService.getMindMap({
        include_tags: true,
        include_entities: false,
        max_nodes: 100,
      })
      setData(mapData)
    } catch (error) {
      console.error('Failed to load mind map:', error)
      // Use sample data for demo
      setData(getSampleData())
    } finally {
      setIsLoading(false)
    }
  }

  const renderGraph = useCallback(() => {
    if (!data || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    const g = svg.append('g')

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(data.edges)
        .id((d: any) => d.id)
        .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(data.edges)
      .enter()
      .append('line')
      .attr('stroke', '#475569')
      .attr('stroke-width', (d) => Math.sqrt(d.weight) * 2)
      .attr('stroke-opacity', 0.6)

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, MindMapNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )
      .on('click', (event, d) => {
        setSelectedNode(d)
      })

    // Add circles
    node.append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)

    // Add labels
    node.append('text')
      .attr('dy', (d) => d.size + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '12px')
      .text((d) => d.label.length > 20 ? d.label.substring(0, 20) + '...' : d.label)

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event: d3.D3DragEvent<SVGGElement, MindMapNode, MindMapNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, MindMapNode, MindMapNode>) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, MindMapNode, MindMapNode>) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }
  }, [data])

  const handleZoomIn = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.5
    )
  }

  const handleZoomOut = () => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.67
    )
  }

  const handleCenter = () => {
    if (!svgRef.current || !containerRef.current) return
    const svg = d3.select(svgRef.current)
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Graph</h1>
          <p className="text-secondary-400">Visualize connections in your knowledge base</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <FilterList fontSize="small" className="mr-1" />
            Filter
          </Button>
          <Button variant="ghost" size="sm" onClick={loadMindMap}>
            <Refresh fontSize="small" className="mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Graph Container */}
      <Card className="flex-1 relative overflow-hidden">
        <div ref={containerRef} className="absolute inset-0">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="bg-secondary-900"
          />
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <Button variant="secondary" size="sm" onClick={handleZoomIn}>
            <ZoomIn fontSize="small" />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleZoomOut}>
            <ZoomOut fontSize="small" />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCenter}>
            <CenterFocusStrong fontSize="small" />
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-secondary-800/90 rounded-lg p-3 space-y-2">
          <p className="text-xs text-secondary-400 font-medium">Legend</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary-500" />
            <span className="text-xs text-secondary-300">Content</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs text-secondary-300">Subject</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-secondary-300">Tag</span>
          </div>
        </div>

        {/* Node Info Panel */}
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 right-4 w-64 bg-secondary-800 rounded-lg p-4 border border-secondary-700"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedNode.color }}
              />
              <button
                onClick={() => setSelectedNode(null)}
                className="text-secondary-500 hover:text-white"
              >
                ×
              </button>
            </div>
            <h3 className="font-medium text-white mb-1">{selectedNode.label}</h3>
            <Badge variant="default" size="sm">
              {selectedNode.type}
            </Badge>
          </motion.div>
        )}
      </Card>
    </div>
  )
}

function getSampleData(): MindMapData {
  return {
    nodes: [
      { id: '1', label: 'JavaScript', type: 'subject', size: 25, color: '#8b5cf6' },
      { id: '2', label: 'React', type: 'subject', size: 20, color: '#8b5cf6' },
      { id: '3', label: 'TypeScript', type: 'subject', size: 20, color: '#8b5cf6' },
      { id: '4', label: 'React Hooks Guide', type: 'content', size: 15, color: '#0ea5e9' },
      { id: '5', label: 'TypeScript Basics', type: 'content', size: 15, color: '#0ea5e9' },
      { id: '6', label: 'State Management', type: 'content', size: 15, color: '#0ea5e9' },
      { id: '7', label: 'tutorial', type: 'tag', size: 10, color: '#22c55e' },
      { id: '8', label: 'frontend', type: 'tag', size: 12, color: '#22c55e' },
      { id: '9', label: 'Node.js', type: 'subject', size: 18, color: '#8b5cf6' },
      { id: '10', label: 'Express API', type: 'content', size: 15, color: '#0ea5e9' },
    ],
    edges: [
      { source: '1', target: '2', weight: 3, type: 'subject' },
      { source: '1', target: '3', weight: 2, type: 'subject' },
      { source: '2', target: '4', weight: 2, type: 'subject' },
      { source: '3', target: '5', weight: 2, type: 'subject' },
      { source: '2', target: '6', weight: 2, type: 'subject' },
      { source: '4', target: '7', weight: 1, type: 'tag' },
      { source: '5', target: '7', weight: 1, type: 'tag' },
      { source: '4', target: '8', weight: 1, type: 'tag' },
      { source: '6', target: '8', weight: 1, type: 'tag' },
      { source: '1', target: '9', weight: 2, type: 'subject' },
      { source: '9', target: '10', weight: 2, type: 'subject' },
    ],
  }
}
