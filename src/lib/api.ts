// Typed API client — all requests go through Vite proxy (/api, /pmi → :8000)

// ── Types ──────────────────────────────────────────────────────────────────

export interface AutopsyRecord {
  "CPR Number": string;
  Age: number;
  Sex: string;
  Height: number;
  Weight: number;
  Putrefaction: number;
  Putre_level: string | null;
  "Algor Mortis": number;
  "Rigor Mortis": string;
  "Livor Mortis": string;
  "Stomach Contents": string;
  "Vitreous Potassium": number;
  Entomology: string;
}

export interface AutopsiesResponse {
  data: AutopsyRecord[];
  count: number;
}

export interface TimelineEvent {
  id: string | number;
  time: string;
  title: string;
  eventType: string;
  description: string;
  confidence: number;
  severity: "critical" | "high" | "medium" | "low";
  aiInsight: string;
}

export interface TimelineResponse {
  case_id: string;
  timeline: TimelineEvent[];
}

export interface MovementPoint {
  lat: number;
  lng: number;
  label: string;
  time: string;
  type?: string;
}

export interface MovementResponse {
  case_id: string;
  movement: MovementPoint[];
}

export interface SearchResult {
  document: string;
  metadata: Record<string, unknown>;
  distance: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface PMIRequest {
  Age: number;
  Sex: string;
  Height: number;
  Weight: number;
  Putrefaction: number;
  Putre_level: string;
  "Rigor Mortis": string;
  "Livor Mortis": string;
  "Algor Mortis": number;
  "Stomach Contents": string;
  "Vitreous Potassium": number;
  Entomology: string;
}

export interface PMIResponse {
  predicted_pmi_hours: number;
  confidence_score: number;
  explanation: Record<string, number>;
  message: string;
}

export interface StatsResponse {
  total_autopsies: number;
  active_cases: number;
  high_risk: number;
  ai_flagged: number;
  contradictions: number;
  missing_evidence: number;
  backend_online: boolean;
}

// ── Core fetch helper ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Autopsy endpoints ──────────────────────────────────────────────────────

export function fetchAutopsies(limit = 50, skip = 0): Promise<AutopsiesResponse> {
  return apiFetch<AutopsiesResponse>(`/api/autopsies?limit=${limit}&skip=${skip}`);
}

export function fetchAutopsyByCPR(cpr: string): Promise<AutopsyRecord> {
  return apiFetch<AutopsyRecord>(`/api/autopsy/${encodeURIComponent(cpr)}`);
}

// ── Case endpoints ─────────────────────────────────────────────────────────

export function fetchTimeline(caseId: string): Promise<TimelineResponse> {
  return apiFetch<TimelineResponse>(`/api/cases/${encodeURIComponent(caseId)}/timeline`);
}

export function fetchMovement(caseId: string): Promise<MovementResponse> {
  return apiFetch<MovementResponse>(`/api/cases/${encodeURIComponent(caseId)}/movement`);
}

export function fetchStats(): Promise<StatsResponse> {
  return apiFetch<StatsResponse>("/api/stats");
}

// ── Evidence search ────────────────────────────────────────────────────────

export function searchEvidence(query: string, nResults = 5): Promise<SearchResponse> {
  return apiFetch<SearchResponse>(
    `/api/search?query=${encodeURIComponent(query)}&n_results=${nResults}`
  );
}

// ── PMI prediction ─────────────────────────────────────────────────────────

export function predictPMI(data: PMIRequest): Promise<PMIResponse> {
  return apiFetch<PMIResponse>("/api/pmi/predict", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
