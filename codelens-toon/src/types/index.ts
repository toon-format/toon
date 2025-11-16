/**
 * Core types for CodeLens-TOON
 */

export interface ProjectMetadata {
  name: string
  language: string
  totalFiles: number
  totalLOC: number
  analyzedAt: string
}

export interface ModuleInfo {
  name: string
  path: string
  purpose: string
  loc: number
  exports: number
  imports: number
}

export interface ClassInfo {
  module: string
  name: string
  methods: number
  properties: number
  loc: number
  exported: boolean
}

export interface FunctionInfo {
  module: string
  name: string
  params: number
  loc: number
  complexity: number
  async: boolean
  exported: boolean
}

export interface DependencyInfo {
  from: string
  to: string
  type: 'import' | 'call' | 'extends' | 'implements'
}

/**
 * Level 1: Project Overview
 */
export interface Level1Output {
  project: ProjectMetadata
  modules: ModuleInfo[]
  summary: {
    totalClasses: number
    totalFunctions: number
    totalDependencies: number
  }
}

/**
 * Level 2: Module/Class Signatures
 */
export interface Level2Output {
  project: ProjectMetadata
  modules: ModuleInfo[]
  classes: ClassInfo[]
  functions: FunctionInfo[]
}

/**
 * Level 3: Detailed Implementations
 */
export interface Level3Output {
  project: ProjectMetadata
  modules: ModuleInfo[]
  classes: Array<{
    module: string
    name: string
    methods: Array<{
      name: string
      signature: string
      loc: number
      body?: string
    }>
  }>
  functions: Array<{
    module: string
    name: string
    signature: string
    loc: number
    body?: string
  }>
}

export type AnalysisLevel = 1 | 2 | 3

export interface AnalysisOptions {
  level: AnalysisLevel
  includeBody?: boolean
  maxBodyLines?: number
}

export interface CodeLensOutput {
  level: AnalysisLevel
  data: Level1Output | Level2Output | Level3Output
  metadata: {
    generatedAt: string
    tokensEstimate: number
  }
}
