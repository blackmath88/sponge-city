export type SourceId = 'basel-stadt' | 'opendata-swiss' | 'border-catalog';
export interface DatasetSource { id: SourceId; name: string; catalogUrl: string; apiType: 'Opendatasoft' | 'CKAN' | 'stub'; geography: string; enabled: boolean }
export interface DatasetField { name: string; type?: string; description?: string }
export type DatasetClass = 'tabular' | 'geospatial-vector' | 'raster-grid' | 'metadata-api' | 'administrative-boundary' | 'climate-indicator';
export interface DatasetMetadata {
  id: string; source: SourceId; title: string; short_description: string; full_description: string; tags: string[]; geography: string;
  format: string[]; api_type: string; endpoint_url: string; geometry_type?: string; temporal_coverage?: string; update_frequency?: string;
  license?: string; fields?: DatasetField[]; dataset_class?: DatasetClass;
  spatial_relevance?: string; hotspot_use?: 'direct' | 'supporting' | 'discovery'; relevance_for_scoping: boolean; notes?: string;
}
export interface SelectedAnalysisLayer { datasetId: string; enabled: boolean; indicator?: keyof AreaIndicators }
export interface AreaIndicators {
  heat: number; nightCooling: number; canopyDeficit: number; sealedSurface: number; runoff: number;
  coolingOpportunity: number; evidenceQuality: number; sources: string[]; missingData: string[];
}
export interface ScoreComponent { key: string; label: string; value: number; weight: number; contribution: number; available: boolean }
export interface ScopingScoreBreakdown { score: number; components: ScoreComponent[]; confidence: 'low' | 'medium' | 'high'; explanation: string[] }
export interface SiteShortlistEntry { areaId: string; addedAt: string; note?: string }
export interface CandidateArea { id: string; name: string; district: string; coordinates: [number, number]; indicators: AreaIndicators; problematics: string[]; prototypePotential: string; directions: string[]; constraints: string[]; profile?: string; prototypeStory?: string }
