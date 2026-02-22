import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as d3 from 'd3'
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Refresh,
  FilterList,
  Search,
  AutoFixHigh,
  OpenInNew,
  Close,
  Insights,
} from '@mui/icons-material'
import { Button, Card, CardContent, Badge } from '../components/ui'
import { mindmapService } from '../services'
import type { MindMapData, MindMapNode } from '../types'
import toast from 'react-hot-toast'

export default function MindMapPage() {
  const [data, setData] = useState<MindMapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDiscovering, setIsDiscovering] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Filters
  const [filterSubject, setFilterSubject] = useState('')
  const [filterTags, setFilterTags] = useState('')
  const [maxNodes, setMaxNodes] = useState(100)
  const [includeLinks, setIncludeLinks] = useState(true)
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])

  useEffect(() => {
    loadMindMap()
  }, [])

  useEffect(() => {
    if (data && svgRef.current && containerRef.current) {
      renderGraph()
    }
  }, [data, searchQuery])

  const loadMindMap = async () => {
    setIsLoading(true)
    try {
      const params: Record<string, any> = {
        include_links: includeLinks,
        max_nodes: maxNodes,
      }
      if (filterSubject) params.subject = filterSubject
      if (filterTags) params.tags = filterTags

      const mapData = await mindmapService.getMindMap(params)
      setData(mapData)

      // Extract subjects from nodes for filter dropdown
      const subjects = new Set<string>()
      mapData.nodes.forEach((n: any) => {
        if (n.data?.subject || (n as any).subject) {
          subjects.add((n as any).subject || n.data?.subject)
        }
      })
      setAvailableSubjects(Array.from(subjects))
    } catch (error) {
      console.error('Failed to load mind map:', error)
      setData(getSampleData())
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiscover = async () => {
    setIsDiscovering(true)
    try {
      const result = await mindmapService.autoDiscoverLinks(0.65)
      if (result.discovered > 0) {
        toast.success(`Discovered ${result.discovered} new connections!`)
        loadMindMap()
      } else {
        toast.success('No new connections found')
      }
    } catch (error) {
      toast.error('Discovery failed - embeddings may not be available')
    } finally {
      setIsDiscovering(false)
    }
  }

  const applyFilters = () => {
    setShowFilters(false)
    loadMindMap()
  }

  const renderGraph = useCallback(() => {
    if (!data || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    // Filter nodes if search active
    let filteredNodes = [...data.nodes]
    let filteredEdges = [...data.edges]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchIds = new Set(
        filteredNodes
          .filter(n => n.label.toLowerCase().includes(q))
          .map(n => n.id)
      )
      filteredNodes = filteredNodes.filter(n => matchIds.has(n.id))
      filteredEdges = filteredEdges.filter(
        e => matchIds.has(typeof e.source === 'string' ? e.source : (e.source as any).id) &&
             matchIds.has(typeof e.target === 'string' ? e.target : (e.target as any).id)
      )
    }

    if (filteredNodes.length === 0) return

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Add defs for gradients and markers
    const defs = svg.append('defs')

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g')

    // Edge type colors
    const edgeColors: Record<string, string> = {
      manual: '#8b5cf6',
      semantic: '#06b6d4',
      shared_tag: '#22c55e',
      same_subject: '#f59e0b',
      related: '#ec4899',
    }

    // Create force simulation
    const simulation = d3.forceSimulation(filteredNodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(filteredEdges)
        .id((d: any) => d.id)
        .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(filteredEdges)
      .enter()
      .append('line')
      .attr('stroke', (d) => edgeColors[d.type] || '#475569')
      .attr('stroke-width', (d) => Math.max(1, Math.sqrt(d.weight) * 2))
      .attr('stroke-opacity', 0.5)
      .attr('stroke-dasharray', (d: any) => d.type === 'shared_tag' ? '4,4' : d.type === 'same_subject' ? '8,4' : 'none')

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(filteredNodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )
      .on('click', (_event: any, d: MindMapNode) => {
        setSelectedNode(d)
      })
      .on('dblclick', (_event: any, d: MindMapNode) => {
        if (d.type === 'content') {
          navigate(`/content/${d.id}`)
        }
      })

    // Add circles with glow for highlighted
    node.append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => {
        if (searchQuery && d.label.toLowerCase().includes(searchQuery.toLowerCase())) {
          return '#fff'
        }
        return d.color
      })
      .attr('stroke-width', (d) => {
        if (searchQuery && d.label.toLowerCase().includes(searchQuery.toLowerCase())) return 3
        return 2
      })
      .attr('stroke-opacity', 0.6)
      .attr('filter', (d) => {
        if (searchQuery && d.label.toLowerCase().includes(searchQuery.toLowerCase())) {
          return 'url(#glow)'
        }
        return ''
      })

    // Type indicator (inner circle for content nodes)
    node.filter(d => d.type === 'content')
      .append('circle')
      .attr('r', (d) => d.size * 0.4)
      .attr('fill', 'rgba(0,0,0,0.3)')

    // Add labels
    node.append('text')
      .attr('dy', (d) => d.size + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '11px')
      .attr('font-weight', (d) => d.type === 'subject' ? '600' : '400')
      .text((d) => d.label.length > 25 ? d.label.substring(0, 25) + '...' : d.label)

    // Node count label
    node.filter(d => d.type === 'subject' || d.type === 'tag')
      .append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text((d: any) => d.data?.count || '')

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: any) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }
  }, [data, searchQuery])

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

  // Stats
  const nodeCount = data?.nodes.length || 0
  const edgeCount = data?.edges.length || 0
  const contentNodes = data?.nodes.filter(n => n.type === 'content').length || 0

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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Insights className="text-primary-400" /> Knowledge Graph
          </h1>
          <p className="text-secondary-400">
            {nodeCount} nodes · {edgeCount} connections · {contentNodes} content items
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-secondary-500" fontSize="small" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm bg-secondary-800 border border-secondary-700 rounded-lg text-white focus:border-primary-500 focus:outline-none w-48"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'text-primary-400' : ''}
          >
            <FilterList fontSize="small" className="mr-1" />
            Filter
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDiscover}
            disabled={isDiscovering}
          >
            <AutoFixHigh fontSize="small" className="mr-1" />
            {isDiscovering ? 'Discovering...' : 'Discover Links'}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadMindMap}>
            <Refresh fontSize="small" className="mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardContent className="p-4 flex items-end gap-4 flex-wrap">
                <div>
                  <label className="block text-xs text-secondary-400 mb-1">Subject</label>
                  <select
                    value={filterSubject}
                    onChange={e => setFilterSubject(e.target.value)}
                    className="bg-secondary-800 border border-secondary-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none"
                  >
                    <option value="">All Subjects</option>
                    {availableSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-secondary-400 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={filterTags}
                    onChange={e => setFilterTags(e.target.value)}
                    placeholder="e.g. react, typescript"
                    className="bg-secondary-800 border border-secondary-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none w-48"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary-400 mb-1">Max Nodes: {maxNodes}</label>
                  <input
                    type="range"
                    min={10}
                    max={300}
                    value={maxNodes}
                    onChange={e => setMaxNodes(Number(e.target.value))}
                    className="accent-primary-500 w-32"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeLinks"
                    checked={includeLinks}
                    onChange={e => setIncludeLinks(e.target.checked)}
                    className="accent-primary-500"
                  />
                  <label htmlFor="includeLinks" className="text-sm text-secondary-300">Include links</label>
                </div>
                <Button size="sm" onClick={applyFilters}>Apply</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
          <p className="text-xs text-secondary-400 font-medium">Node Types</p>
          {[
            { color: '#4CAF50', label: 'Text' },
            { color: '#2196F3', label: 'Document' },
            { color: '#FF9800', label: 'Image' },
            { color: '#9C27B0', label: 'Audio' },
            { color: '#F44336', label: 'Video' },
            { color: '#00BCD4', label: 'Web' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-secondary-300">{item.label}</span>
            </div>
          ))}
          <div className="border-t border-secondary-700 pt-2 mt-2">
            <p className="text-xs text-secondary-400 font-medium mb-1">Edge Types</p>
            {[
              { color: '#8b5cf6', label: 'Manual', dash: false },
              { color: '#06b6d4', label: 'Semantic', dash: false },
              { color: '#22c55e', label: 'Shared Tag', dash: true },
              { color: '#f59e0b', label: 'Same Subject', dash: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-4 h-0.5" style={{
                  backgroundColor: item.color,
                  borderTop: item.dash ? `2px dashed ${item.color}` : undefined,
                }} />
                <span className="text-xs text-secondary-300">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-secondary-500 mt-1">Double-click node → open content</p>
        </div>

        {/* Node Info Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-4 w-72 bg-secondary-800 rounded-lg p-4 border border-secondary-700 shadow-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedNode.color }}
                  />
                  <Badge variant="info" size="sm">
                    {selectedNode.type}
                  </Badge>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-secondary-500 hover:text-white"
                >
                  <Close fontSize="small" />
                </button>
              </div>
              <h3 className="font-medium text-white mb-2">{selectedNode.label}</h3>
              {selectedNode.data && (
                <div className="space-y-1 text-xs text-secondary-400">
                  {(selectedNode as any).subject && (
                    <p>Subject: <span className="text-secondary-200">{(selectedNode as any).subject}</span></p>
                  )}
                  {(selectedNode as any).tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(selectedNode as any).tags.map((tag: string) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-secondary-700 rounded text-[10px]">{tag}</span>
                      ))}
                    </div>
                  )}
                  {selectedNode.data.created_at && (
                    <p>Created: {new Date(selectedNode.data.created_at as string).toLocaleDateString()}</p>
                  )}
                  {selectedNode.data.view_count !== undefined && (
                    <p>Views: {selectedNode.data.view_count as number}</p>
                  )}
                </div>
              )}
              {selectedNode.type === 'content' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3 w-full"
                  onClick={() => navigate(`/content/${selectedNode.id}`)}
                >
                  <OpenInNew fontSize="small" className="mr-1" /> Open Content
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
