'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ReactFlow, Node, Edge, Controls, Background, BackgroundVariant,
    useNodesState, useEdgesState, Position, MarkerType, Handle
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronDown, ChevronUp, Layers, Code2, Brain, Trophy, CheckCircle2,
    Sparkles, Play
} from 'lucide-react'
import { Badge } from '@repo/ui/components/ui/badge'
import { cn } from '@repo/ui/lib/utils'

// ============================================================================
// Custom Node Types
// ============================================================================

interface TaskNodeData {
    label: string
    description?: string
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
    tags?: string[]
    estimatedMinutes?: number
    index: number
    total: number
}

interface MilestoneNodeData {
    label: string
    description?: string
    type: 'start' | 'milestone' | 'end'
    progress?: number
}

// Custom Task Node Component
function TaskNode({ data }: { data: TaskNodeData }) {
    const statusColors = {
        NOT_STARTED: 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900',
        IN_PROGRESS: 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800/30 ring-2 ring-neutral-900/20',
        COMPLETED: 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800/30',
    }

    const difficultyColors = {
        BEGINNER: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100',
        INTERMEDIATE: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100',
        ADVANCED: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100',
    }

    const statusIcons = {
        NOT_STARTED: <div className="w-4 h-4 rounded-full border-2 border-neutral-400" />,
        IN_PROGRESS: <Play className="w-4 h-4 text-neutral-800 dark:text-neutral-200 fill-neutral-800" />,
        COMPLETED: <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />,
    }

    return (
        <div className={cn(
            'px-4 py-3 rounded-xl border-2 shadow-lg transition-all duration-300 min-w-[200px] max-w-[280px]',
            statusColors[data.status]
        )}>
            <Handle type="target" position={Position.Top} className="!bg-neutral-400 !w-2 !h-2" />

            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        #{data.index}/{data.total}
                    </span>
                    {statusIcons[data.status]}
                </div>
                <Badge className={cn('text-xs px-1.5 py-0', difficultyColors[data.difficulty])}>
                    {data.difficulty}
                </Badge>
            </div>
            <h4 className={cn(
                'font-semibold text-sm leading-tight mb-1',
                data.status === 'COMPLETED' ? 'line-through text-neutral-500' : 'text-neutral-900 dark:text-white'
            )}>
                {data.label}
            </h4>

            {
                data.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {data.description}
                    </p>
                )
            }

            {
                data.tags && data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {
                            data.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="text-xs px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-400">
                                    {tag}
                                </span>
                            ))
                        }
                    </div>
                )
            }

            <Handle type="source" position={Position.Bottom} className="!bg-neutral-400 !w-2 !h-2" />
        </div>
    )
}

// Custom Milestone Node Component
function MilestoneNode({ data }: { data: MilestoneNodeData }) {
    const typeStyles = {
        start: 'bg-gradient-to-br from-neutral-900 to-neutral-800 text-white',
        milestone: 'bg-gradient-to-br from-neutral-900 to-neutral-800 text-white',
        end: 'bg-gradient-to-br from-neutral-900 to-neutral-800 text-white',
    }

    const typeIcons = {
        start: <Play className="w-5 h-5" />,
        milestone: <Trophy className="w-5 h-5" />,
        end: <Sparkles className="w-5 h-5" />,
    }

    return (
        <div className={cn(
            'px-6 py-4 rounded-2xl shadow-xl border-2 border-white/20 min-w-[180px]',
            typeStyles[data.type]
        )}>
            <Handle type="target" position={Position.Top} className="!bg-white !w-2 !h-2" />

            <div className="flex items-center gap-3">
                {typeIcons[data.type]}
                <div>
                    <h4 className="font-bold text-sm">{data.label}</h4>
                    {
                        data.description && (
                            <p className="text-xs opacity-90">{data.description}</p>
                        )
                    }
                </div>
            </div>

            {
                data.progress !== undefined && (
                    <div className="mt-2 bg-white/20 rounded-full h-1.5">
                        <div
                            className="bg-white rounded-full h-full transition-all duration-500"
                            style={{ width: `${data.progress}%` }}
                        />
                    </div>
                )
            }

            <Handle type="source" position={Position.Bottom} className="!bg-white !w-2 !h-2" />
        </div>
    )
}

// Custom Phase Label Node
function PhaseLabelNode({ data }: { data: { label: string; icon: 'setup' | 'core' | 'advanced' | 'polish' } }) {
    const iconMap = {
        setup: <Layers className="w-4 h-4" />,
        core: <Code2 className="w-4 h-4" />,
        advanced: <Brain className="w-4 h-4" />,
        polish: <Sparkles className="w-4 h-4" />,
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 dark:bg-neutral-100 rounded-full text-white dark:text-black">
            {iconMap[data.icon]}
            <span className="text-xs font-semibold">{data.label}</span>
        </div>
    )
}

// ============================================================================
// Node Types Registration
// ============================================================================

const nodeTypes = {
    task: TaskNode,
    milestone: MilestoneNode,
    phaseLabel: PhaseLabelNode,
}

// ============================================================================
// Blueprint Flowchart Component
// ============================================================================

interface BlueprintFlowchartProps {
    tasks: Array<{
        id: string
        title: string
        description?: string[]
        difficulty: string
        tags?: string[]
        status?: 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED'
        orderIndex?: number
    }>
    projectTitle: string
    progressPercentage?: number
    onTaskClick?: (taskId: string) => void
}

export default function BlueprintFlowchart({
    tasks,
    projectTitle,
    progressPercentage = 0,
    onTaskClick
}: BlueprintFlowchartProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    // Generate nodes and edges from tasks
    const { initialNodes, initialEdges } = useMemo(() => {
        const nodes: Node[] = []
        const edges: Edge[] = []

        const sortedTasks = [...tasks].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        const totalTasks = sortedTasks.length

        // Calculate layout positions
        const tasksPerRow = 4
        const nodeWidth = 260
        const nodeHeight = 150
        const horizontalGap = 80
        const verticalGap = 100
        const startX = 100
        const startY = 150

        // Add start node
        nodes.push({
            id: 'start',
            type: 'milestone',
            position: { x: startX + ((tasksPerRow - 1) * (nodeWidth + horizontalGap)) / 2, y: 20 },
            data: {
                label: 'Start Project',
                description: projectTitle,
                type: 'start',
                progress: progressPercentage,
            },
        })

        // Add task nodes in a grid-like flow
        sortedTasks.forEach((task, index) => {
            const row = Math.floor(index / tasksPerRow)
            const col = row % 2 === 0 ? index % tasksPerRow : tasksPerRow - 1 - (index % tasksPerRow)

            const statusMap: Record<string, 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'> = {
                'TO_DO': 'NOT_STARTED',
                'IN_PROGRESS': 'IN_PROGRESS',
                'COMPLETED': 'COMPLETED',
            }

            nodes.push({
                id: task.id,
                type: 'task',
                position: {
                    x: startX + col * (nodeWidth + horizontalGap),
                    y: startY + row * (nodeHeight + verticalGap)
                },
                data: {
                    label: task.title,
                    description: task.description?.[0],
                    difficulty: task.difficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
                    status: statusMap[task.status || 'TO_DO'] || 'NOT_STARTED',
                    tags: task.tags,
                    index: index + 1,
                    total: totalTasks,
                },
            })
        })

        // Add end node
        const lastRow = Math.floor((totalTasks - 1) / tasksPerRow)
        nodes.push({
            id: 'end',
            type: 'milestone',
            position: {
                x: startX + ((tasksPerRow - 1) * (nodeWidth + horizontalGap)) / 2,
                y: startY + (lastRow + 1) * (nodeHeight + verticalGap) + 50
            },
            data: {
                label: 'Project Complete!',
                description: 'Congratulations!',
                type: 'end',
            },
        })

        // Create edges
        // Start to first task
        if (sortedTasks.length > 0) {
            edges.push({
                id: 'start-to-first',
                source: 'start',
                target: sortedTasks[0]?.id ?? '',
                type: 'smoothstep',
                animated: progressPercentage < 100,
                style: { stroke: '#737373', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#737373' },
            })
        }

        // Connect tasks in sequence
        for (let i = 0; i < sortedTasks.length - 1; i++) {
            const currentTask = sortedTasks[i]
            const nextTask = sortedTasks[i + 1]
            const currentRow = Math.floor(i / tasksPerRow)
            const nextRow = Math.floor((i + 1) / tasksPerRow)

            const isCompleted = currentTask?.status === 'COMPLETED'

            edges.push({
                id: `${currentTask?.id}-to-${nextTask?.id}`,
                source: currentTask?.id ?? '',
                target: nextTask?.id ?? '',
                type: currentRow !== nextRow ? 'smoothstep' : 'smoothstep',
                animated: !isCompleted && progressPercentage < 100,
                style: {
                    stroke: isCompleted ? '#22c55e' : '#737373',
                    strokeWidth: 2,
                    opacity: isCompleted ? 1 : 0.6,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: isCompleted ? '#22c55e' : '#737373'
                },
            })
        }

        // Last task to end
        if (sortedTasks.length > 0) {
            const lastTask = sortedTasks[sortedTasks.length - 1]
            edges.push({
                id: 'last-to-end',
                source: lastTask?.id ?? '',
                target: 'end',
                type: 'smoothstep',
                animated: lastTask?.status !== 'COMPLETED',
                style: { stroke: '#737373', strokeWidth: 2, opacity: 0.6 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#737373' },
            })
        }

        return { initialNodes: nodes, initialEdges: edges }
    }, [tasks, projectTitle, progressPercentage])

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

    /*
     * Re-seed when the tasks change.
     *
     * `useNodesState` takes its argument as an INITIAL value and ignores it
     * afterwards, so the `useMemo` above recomputed the nodes on every task
     * change and nothing ever looked at the result: ticking a task off left the
     * flowchart showing the old status for as long as the page stayed open
     * (sweep 2026-09-23).
     */
    useEffect(() => {
        setNodes(initialNodes)
        setEdges(initialEdges)
    }, [initialNodes, initialEdges, setNodes, setEdges])

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        if (node.type === 'task' && onTaskClick) {
            onTaskClick(node.id)
        }
    }, [onTaskClick])

    // Calculate height based on tasks
    const flowchartHeight = useMemo(() => {
        const tasksPerRow = 4
        // Parenthesised. `??` binds looser than `/`, so `tasks?.length ?? 0 / 4`
        // parsed as `tasks?.length ?? (0 / 4)` - the row count was the TASK
        // COUNT, and the canvas was drawn four times taller than it needed to be.
        const rows = Math.ceil((tasks?.length ?? 0) / tasksPerRow)
        return Math.max(500, 250 + rows * 250)
    }, [tasks?.length])

    return (
        <div className="w-full bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                            Project Blueprint
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {tasks.length} tasks · {Math.round(progressPercentage)}% complete
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2">
                        <div className="w-32 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-neutral-900 to-neutral-800"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                        </div>
                        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            {Math.round(progressPercentage)}%
                        </span>
                    </div>
                    {
                        isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                        )
                    }
                </div>
            </button>
            <AnimatePresence>
                {
                    isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: flowchartHeight, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onNodeClick={handleNodeClick}
                                nodeTypes={nodeTypes}
                                fitView
                                fitViewOptions={{ padding: 0.2 }}
                                minZoom={0.3}
                                maxZoom={1.5}
                                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                                proOptions={{ hideAttribution: true }}
                                className="bg-transparent"
                            >
                                <Background
                                    variant={BackgroundVariant.Dots}
                                    gap={20}
                                    size={1}
                                    color="#d4d4d4"
                                    className="dark:opacity-30"
                                />
                                <Controls
                                    className="!bg-white dark:!bg-neutral-800 !border-neutral-200 dark:!border-neutral-700 !rounded-xl !shadow-lg"
                                    showInteractive={false}
                                />
                            </ReactFlow>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </div>
    )
}