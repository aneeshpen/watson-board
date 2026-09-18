// Investigative data — Karnataka + Tamil Nadu
export type Severity = "low" | "medium" | "high" | "critical";

export interface CaseSummary {
  id: string;
  fir: string;
  title: string;
  district: string;
  status: "Active" | "Cold" | "Closed" | "Review";
  severity: Severity;
  aiConfidence: number;
  flagged: boolean;
  officer: string;
  opened: string;
  type: string;
  victims: number;
  suspects: number;
  evidence: number;
  contradictions: number;
}

export const districts = [
  // Karnataka
  "Bengaluru",
  "Mysuru",
  "Hubballi",
  "Belagavi",
  "Mangaluru",
  "Kalaburagi",
  "Ballari",
  "Shivamogga",
  "Tumakuru",
  "Udupi",
  // Tamil Nadu
  "Chennai",
  "Coimbatore",
  "Madurai",
  "Salem",
  "Trichy",
  "Tirunelveli",
  "Vellore",
  "Erode",
  "Thanjavur",
  "Kanyakumari",
];

export const cases: CaseSummary[] = [
  {
    id: "C-2041",
    fir: "FIR/2025/BNG/00412",
    title: "City Railway Junction Homicide",
    district: "Bengaluru",
    status: "Active",
    severity: "critical",
    aiConfidence: 87,
    flagged: true,
    officer: "Insp. R. Karthik",
    opened: "2026-04-22",
    type: "Homicide",
    victims: 1,
    suspects: 3,
    evidence: 24,
    contradictions: 4,
  },
  {
    id: "C-2042",
    fir: "FIR/2025/MYS/00231",
    title: "Mysuru Palace Road Bank Heist",
    district: "Mysuru",
    status: "Active",
    severity: "high",
    aiConfidence: 73,
    flagged: true,
    officer: "Insp. P. Anitha",
    opened: "2026-04-29",
    type: "Robbery",
    victims: 0,
    suspects: 4,
    evidence: 18,
    contradictions: 2,
  },
  {
    id: "C-2043",
    fir: "FIR/2025/HBL/00871",
    title: "Tungabhadra River Body",
    district: "Hubballi",
    status: "Review",
    severity: "high",
    aiConfidence: 64,
    flagged: true,
    officer: "SI K. Mohan",
    opened: "2026-05-01",
    type: "Suspicious Death",
    victims: 1,
    suspects: 2,
    evidence: 16,
    contradictions: 5,
  },
  {
    id: "C-2044",
    fir: "FIR/2025/BLG/00120",
    title: "Belagavi Highway Hit & Run",
    district: "Belagavi",
    status: "Active",
    severity: "medium",
    aiConfidence: 58,
    flagged: false,
    officer: "Insp. M. Selvi",
    opened: "2026-05-03",
    type: "Vehicular",
    victims: 1,
    suspects: 1,
    evidence: 9,
    contradictions: 1,
  },
  {
    id: "C-2045",
    fir: "FIR/2025/MNG/00094",
    title: "Mangaluru Market Stabbing",
    district: "Mangaluru",
    status: "Active",
    severity: "high",
    aiConfidence: 81,
    flagged: true,
    officer: "SI A. Ramesh",
    opened: "2026-05-04",
    type: "Assault",
    victims: 1,
    suspects: 2,
    evidence: 12,
    contradictions: 0,
  },
  {
    id: "C-2046",
    fir: "FIR/2025/KLB/00067",
    title: "Kalaburagi Arson",
    district: "Kalaburagi",
    status: "Cold",
    severity: "medium",
    aiConfidence: 41,
    flagged: false,
    officer: "Insp. D. Vinod",
    opened: "2026-03-19",
    type: "Arson",
    victims: 0,
    suspects: 0,
    evidence: 6,
    contradictions: 0,
  },
  {
    id: "C-2047",
    fir: "FIR/2025/BLL/00203",
    title: "Ballari Kidnapping",
    district: "Ballari",
    status: "Active",
    severity: "critical",
    aiConfidence: 76,
    flagged: true,
    officer: "Insp. S. Hari",
    opened: "2026-05-06",
    type: "Kidnapping",
    victims: 1,
    suspects: 2,
    evidence: 14,
    contradictions: 3,
  },
  {
    id: "C-2048",
    fir: "FIR/2025/BNG/00418",
    title: "Ulsoor Lake Drowning",
    district: "Bengaluru",
    status: "Review",
    severity: "low",
    aiConfidence: 33,
    flagged: false,
    officer: "SI L. Priya",
    opened: "2026-05-07",
    type: "Drowning",
    victims: 1,
    suspects: 0,
    evidence: 5,
    contradictions: 1,
  },
  // Tamil Nadu cases
  {
    id: "C-2049",
    fir: "FIR/2025/CHN/00501",
    title: "Central Station Stabbing",
    district: "Chennai",
    status: "Active",
    severity: "high",
    aiConfidence: 79,
    flagged: true,
    officer: "Insp. V. Kumar",
    opened: "2026-05-10",
    type: "Assault",
    victims: 1,
    suspects: 2,
    evidence: 14,
    contradictions: 2,
  },
  {
    id: "C-2050",
    fir: "FIR/2025/CBE/00142",
    title: "Coimbatore ATM Robbery",
    district: "Coimbatore",
    status: "Review",
    severity: "medium",
    aiConfidence: 62,
    flagged: false,
    officer: "Insp. B. Sundaram",
    opened: "2026-05-11",
    type: "Robbery",
    victims: 0,
    suspects: 3,
    evidence: 9,
    contradictions: 1,
  },
  {
    id: "C-2051",
    fir: "FIR/2025/MDU/00309",
    title: "Madurai Temple Road Arson",
    district: "Madurai",
    status: "Cold",
    severity: "medium",
    aiConfidence: 44,
    flagged: false,
    officer: "SI N. Prakash",
    opened: "2026-04-15",
    type: "Arson",
    victims: 0,
    suspects: 1,
    evidence: 7,
    contradictions: 0,
  },
  {
    id: "C-2052",
    fir: "FIR/2025/TRY/00217",
    title: "Trichy Bus Stand Kidnapping",
    district: "Trichy",
    status: "Active",
    severity: "critical",
    aiConfidence: 83,
    flagged: true,
    officer: "Insp. C. Meena",
    opened: "2026-05-14",
    type: "Kidnapping",
    victims: 1,
    suspects: 2,
    evidence: 11,
    contradictions: 3,
  },
];

export const heatmapZones = [
  // Karnataka
  { district: "Bengaluru", lat: 12.9716, lng: 77.5946, crimes: 142, risk: 92, officers: 28 },
  { district: "Mysuru", lat: 12.2958, lng: 76.6394, crimes: 87, risk: 71, officers: 19 },
  { district: "Hubballi", lat: 15.3647, lng: 75.124, crimes: 64, risk: 68, officers: 14 },
  { district: "Belagavi", lat: 15.8497, lng: 74.4977, crimes: 41, risk: 52, officers: 9 },
  { district: "Mangaluru", lat: 12.9141, lng: 74.856, crimes: 53, risk: 60, officers: 11 },
  { district: "Kalaburagi", lat: 17.3297, lng: 76.8343, crimes: 29, risk: 38, officers: 7 },
  { district: "Ballari", lat: 15.1394, lng: 76.9214, crimes: 47, risk: 64, officers: 10 },
  { district: "Shivamogga", lat: 13.9299, lng: 75.5681, crimes: 18, risk: 31, officers: 5 },
  // Tamil Nadu
  { district: "Chennai", lat: 13.0827, lng: 80.2707, crimes: 128, risk: 88, officers: 25 },
  { district: "Coimbatore", lat: 11.0168, lng: 76.9558, crimes: 79, risk: 67, officers: 17 },
  { district: "Madurai", lat: 9.9252, lng: 78.1198, crimes: 58, risk: 62, officers: 13 },
  { district: "Salem", lat: 11.6643, lng: 78.146, crimes: 37, risk: 48, officers: 8 },
  { district: "Trichy", lat: 10.7905, lng: 78.7047, crimes: 46, risk: 55, officers: 10 },
  { district: "Tirunelveli", lat: 8.7139, lng: 77.7567, crimes: 24, risk: 33, officers: 6 },
  { district: "Vellore", lat: 12.9165, lng: 79.1325, crimes: 42, risk: 58, officers: 9 },
  { district: "Kanyakumari", lat: 8.0883, lng: 77.5385, crimes: 15, risk: 27, officers: 4 },
];

export const liveFeed = [
  { t: "12s ago", text: "New CCTV uploaded — Bengaluru City Railway E-Gate 4", tag: "evidence" },
  { t: "47s ago", text: "Contradiction detected in C-2041 (TOD vs witness)", tag: "alert" },
  { t: "1m ago", text: "Suspect movement reconstructed — C-2042", tag: "ai" },
  { t: "2m ago", text: "Autopsy confidence increased to 82% (C-2043)", tag: "forensic" },
  { t: "3m ago", text: "DNA match found — Suspect S-118 in C-2047", tag: "ai" },
  { t: "5m ago", text: "Officer Karthik joined investigation room C-2041", tag: "officer" },
  { t: "8m ago", text: "Phone metadata parsed — 412 call records (C-2045)", tag: "evidence" },
  { t: "11m ago", text: "Hypothesis updated: Body relocation likely (C-2043)", tag: "ai" },
];

// ─── Forensic Investigation Graph for Case C-2041 ───────────────────────────
export type NodeZone = "victim" | "forensic" | "suspect" | "timeline" | "environmental";
export type RelationType =
  | "dna"
  | "suspicious"
  | "confirmed"
  | "weak"
  | "timeline"
  | "behavioral"
  | "financial"
  | "environmental";

export interface ForensicNode {
  id: string;
  zone: NodeZone;
  type: string;
  label: string;
  sublabel?: string;
  meta?: string;
  confidence?: number;
  riskLevel?: "critical" | "high" | "medium" | "low";
  criminalCount?: number;
  activityTag?: string;
  todRange?: string;
  causeOfDeath?: string;
  autopsyStatus?: string;
  danger?: boolean;
  aiInsight?: string;
  x: number;
  y: number;
}

export interface ForensicEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relationType: RelationType;
  confidence: number;
  timestamp?: string;
  source_ref?: string;
  reasoning?: string;
  danger?: boolean;
}

export const caseGraph: { nodes: ForensicNode[]; edges: ForensicEdge[] } = {
  nodes: [
    // CENTER
    {
      id: "victim-1",
      zone: "victim",
      type: "victim",
      label: "R. Suresh",
      sublabel: "Victim · Age 34 · Male",
      todRange: "19:30 – 21:00",
      causeOfDeath: "Blunt force trauma (occipital)",
      autopsyStatus: "Completed",
      confidence: 76,
      aiInsight:
        "Primary victim. TOD window conflicts with witness statements. Body relocation likely based on livor mortis.",
      x: 0,
      y: 0,
    },

    // SUSPECTS (right)
    {
      id: "suspect-1",
      zone: "suspect",
      type: "suspect",
      label: "Vetri (S-118)",
      sublabel: "Drug supplier · Prior record",
      meta: "DNA match 99.2% · 3 harassment complaints",
      confidence: 87,
      riskLevel: "critical",
      criminalCount: 4,
      activityTag: "DNA Match + Drug Connection",
      aiInsight:
        "DNA found at scene matches S-118 with 99.2% certainty. Financial transfer of ₹40,000 on same night. Primary suspect.",
      danger: true,
      x: 420,
      y: -80,
    },
    {
      id: "suspect-2",
      zone: "suspect",
      type: "suspect",
      label: "Manoj (S-204)",
      sublabel: "Last seen near TOD window",
      meta: "Prior criminal record · CCTV sighting 20:48",
      confidence: 54,
      riskLevel: "high",
      criminalCount: 2,
      activityTag: "Seen Near Crime Scene",
      aiInsight:
        "S-204 was captured on CCTV-0418 near the scene within the TOD window. Witness corroborates sighting at 22:10.",
      x: 420,
      y: 100,
    },
    {
      id: "phone-2",
      zone: "suspect",
      type: "phone",
      label: "+91 90xxx 88 (S1)",
      sublabel: "Suspect phone",
      meta: "Tower overlap with victim · 4 days prior overlap",
      confidence: 81,
      aiInsight:
        "S-118's phone pinged the same tower as victim's during TOD window — placing them within 500m.",
      x: 560,
      y: 20,
    },
    {
      id: "txn-1",
      zone: "suspect",
      type: "txn",
      label: "UPI ₹40,000 Transfer",
      sublabel: "Victim → S-118 · 20:22",
      meta: "Financial motive indicator",
      confidence: 88,
      aiInsight:
        "₹40,000 UPI transfer from victim to S-118 at 20:22 — 30 mins before estimated TOD. Establishes financial motive.",
      danger: true,
      x: 560,
      y: 160,
    },

    // FORENSIC (left)
    {
      id: "dna-1",
      zone: "forensic",
      type: "dna",
      label: "DNA Sample D-77",
      sublabel: "Match 99.2% — S-118",
      meta: "Collected: crime scene · Occipital blood",
      confidence: 99,
      aiInsight:
        "DNA from occipital wound matches S-118 at 99.2% — strongest physical evidence linking suspect to victim.",
      x: -420,
      y: -80,
    },
    {
      id: "autopsy-1",
      zone: "forensic",
      type: "autopsy",
      label: "Autopsy A-2041",
      sublabel: "Blunt force · Occipital",
      meta: "Livor mortis inconsistent ⚠ · Defensive injuries",
      confidence: 76,
      aiInsight:
        "Livor mortis fixed pattern inconsistent with recovery position — strongly indicates post-mortem body relocation.",
      x: -560,
      y: 20,
    },
    {
      id: "tox-1",
      zone: "forensic",
      type: "toxicology",
      label: "Toxicology T-2041",
      sublabel: "Diazepam trace · 0.04 BAC",
      meta: "Sedative trace detected",
      confidence: 82,
      aiInsight:
        "Trace diazepam in blood — possible administration prior to assault. Indicates possible drugging.",
      x: -420,
      y: 80,
    },
    {
      id: "print-1",
      zone: "forensic",
      type: "fingerprint",
      label: "Fingerprints FP-09",
      sublabel: "Partial match recovered",
      meta: "Right palm · blunt object handle",
      confidence: 68,
      aiInsight:
        "Partial fingerprint on recovered blunt object handle — labs running enhancement. 68% confidence partial.",
      x: -560,
      y: 160,
    },

    // TIMELINE (top)
    {
      id: "cctv-1",
      zone: "timeline",
      type: "cctv",
      label: "CCTV-BNG-0412",
      sublabel: "20:42 · 6 frames",
      meta: "Altercation visible — E-Gate 4",
      confidence: 90,
      aiInsight:
        "CCTV at E-Gate 4 captures altercation at 20:42. Victim and S-118 visible in 6 clear frames.",
      x: -150,
      y: -300,
    },
    {
      id: "cctv-2",
      zone: "timeline",
      type: "cctv",
      label: "CCTV-BNG-0418",
      sublabel: "20:48 · Timestamp ⚠",
      meta: "+6 min drift from station clock",
      confidence: 47,
      aiInsight:
        "CCTV-0418 has a +6 minute timestamp drift from station master clock — creates timeline anomaly, under forensic review.",
      danger: true,
      x: 150,
      y: -300,
    },
    {
      id: "tod-1",
      zone: "timeline",
      type: "timeline",
      label: "TOD Estimation",
      sublabel: "Window: 19:30 – 21:00",
      meta: "Vitreous K+ 6.1 mmol/L · Rigor onset",
      confidence: 76,
      aiInsight: "TOD 19:30–21:00 based on vitreous K+ 6.1 mmol/L, rigor, and algor mortis data.",
      x: 0,
      y: -360,
    },
    {
      id: "weapon-1",
      zone: "timeline",
      type: "weapon",
      label: "Blunt Object (Recovered)",
      sublabel: "Iron rod · 600g",
      meta: "Recovered 100m from scene · Partial print",
      confidence: 74,
      aiInsight:
        "Iron rod recovered 100m from Central Station. Blood group matches victim. Partial print under enhancement.",
      danger: true,
      x: -300,
      y: -240,
    },

    // ENVIRONMENTAL (bottom)
    {
      id: "witness-1",
      zone: "environmental",
      type: "witness",
      label: "Anandhi K.",
      sublabel: "Stall owner · Reliable",
      meta: "Saw victim at 20:14 near E-Gate 4",
      confidence: 92,
      aiInsight: "Anandhi K. confirms victim at 20:14 near E-Gate 4. Consistent with CCTV-0412.",
      x: -200,
      y: 300,
    },
    {
      id: "witness-2",
      zone: "environmental",
      type: "witness",
      label: "Auto Driver T.",
      sublabel: "Drop near scene · Inconsistent",
      meta: "Places S-204 at 22:10 — phone was off-tower ⚠",
      confidence: 58,
      aiInsight:
        "Witness places S-204 at scene at 22:10, but S-204's phone showed no tower activity — contradictory.",
      danger: true,
      x: 200,
      y: 300,
    },
    {
      id: "weather-1",
      zone: "environmental",
      type: "weather",
      label: "Weather Log",
      sublabel: "Apr 22 · 20:00–22:00",
      meta: "Overcast · Low visibility · 27°C",
      confidence: 95,
      aiInsight:
        "Overcast sky and low visibility may have impaired witness sightlines and caused CCTV degradation.",
      x: 0,
      y: 380,
    },
    {
      id: "family-1",
      zone: "environmental",
      type: "family",
      label: "Family Statement",
      sublabel: "Wife: K. Meena",
      meta: "Last contact 18:05 · No prior threats reported",
      confidence: 80,
      aiInsight:
        "Victim's wife reports last contact at 18:05. He mentioned meeting 'an old contact' — may be S-118.",
      x: -350,
      y: 360,
    },
  ],

  edges: [
    // Victim ↔ Suspects
    {
      id: "e-v-s1-dna",
      source: "victim-1",
      target: "suspect-1",
      label: "DNA Match",
      relationType: "dna",
      confidence: 99,
      timestamp: "Lab report 23 Apr",
      source_ref: "DNA Sample D-77",
      reasoning: "Occipital blood matched S-118 at 99.2% via STR profiling.",
      danger: true,
    },
    {
      id: "e-v-s1-fin",
      source: "victim-1",
      target: "txn-1",
      label: "Financial Dispute",
      relationType: "financial",
      confidence: 88,
      timestamp: "20:22, Apr 22",
      source_ref: "UPI Statement Apr-26",
      reasoning: "₹40,000 transferred from victim to S-118 before TOD — financial motive.",
      danger: true,
    },
    {
      id: "e-txn-s1",
      source: "txn-1",
      target: "suspect-1",
      label: "Received Payment",
      relationType: "financial",
      confidence: 88,
      timestamp: "20:22, Apr 22",
      source_ref: "UPI Statement",
      reasoning: "S-118 received ₹40,000 from victim on the night of murder.",
      danger: true,
    },
    {
      id: "e-v-s2",
      source: "victim-1",
      target: "suspect-2",
      label: "Last Seen With",
      relationType: "suspicious",
      confidence: 54,
      timestamp: "20:48 CCTV-0418",
      source_ref: "CCTV-BNG-0418",
      reasoning: "S-204 seen near victim at 20:48 per CCTV, within TOD window.",
    },
    {
      id: "e-v-phone2",
      source: "victim-1",
      target: "phone-2",
      label: "Phone Tower Overlap",
      relationType: "behavioral",
      confidence: 81,
      timestamp: "20:22–20:51",
      source_ref: "Phone dump +9198xxx12",
      reasoning: "Victim and S-118 phones on same cell tower 20:22–20:51 — within 500m.",
      danger: true,
    },
    // Victim ↔ Forensic
    {
      id: "e-v-dna",
      source: "victim-1",
      target: "dna-1",
      label: "Autopsy Indicator",
      relationType: "dna",
      confidence: 99,
      timestamp: "Lab report 23 Apr",
      source_ref: "DNA Sample D-77",
      reasoning: "DNA from occipital wound links directly to victim's case.",
    },
    {
      id: "e-v-autopsy",
      source: "victim-1",
      target: "autopsy-1",
      label: "Cause of Death",
      relationType: "confirmed",
      confidence: 76,
      timestamp: "Autopsy 23 Apr",
      source_ref: "Autopsy A-2041",
      reasoning: "COD: blunt force trauma occipital. Livor mortis flags body relocation.",
    },
    {
      id: "e-v-tox",
      source: "victim-1",
      target: "tox-1",
      label: "Toxicology Finding",
      relationType: "confirmed",
      confidence: 82,
      timestamp: "Lab report 23 Apr",
      source_ref: "Tox Screen T-2041",
      reasoning: "Trace diazepam in victim's blood suggests possible pre-assault sedation.",
    },
    {
      id: "e-v-print",
      source: "victim-1",
      target: "print-1",
      label: "Fingerprint Evidence",
      relationType: "weak",
      confidence: 68,
      timestamp: "Scene collection 22 Apr",
      source_ref: "FP-09",
      reasoning: "Partial print on weapon handle — inconclusive until lab confirmation.",
    },
    {
      id: "e-dna-s1",
      source: "dna-1",
      target: "suspect-1",
      label: "DNA Match",
      relationType: "dna",
      confidence: 99,
      timestamp: "Lab report 23 Apr",
      source_ref: "DNA Sample D-77",
      reasoning: "STR profiling confirms S-118's DNA matches scene sample at 99.2%.",
      danger: true,
    },
    // Victim ↔ Timeline
    {
      id: "e-v-cctv1",
      source: "victim-1",
      target: "cctv-1",
      label: "Captured at 20:42",
      relationType: "timeline",
      confidence: 90,
      timestamp: "20:42 Apr 22",
      source_ref: "CCTV-BNG-0412",
      reasoning: "Victim visible in 6 CCTV frames at E-Gate 4 — altercation visible.",
    },
    {
      id: "e-v-cctv2",
      source: "victim-1",
      target: "cctv-2",
      label: "Timestamp Anomaly",
      relationType: "timeline",
      confidence: 47,
      timestamp: "20:48 (disputed)",
      source_ref: "CCTV-BNG-0418",
      reasoning: "CCTV-0418 shows victim but has +6 min drift — forensic review ongoing.",
      danger: true,
    },
    {
      id: "e-v-tod",
      source: "victim-1",
      target: "tod-1",
      label: "TOD Estimation",
      relationType: "timeline",
      confidence: 76,
      timestamp: "Autopsy 23 Apr",
      source_ref: "Autopsy A-2041",
      reasoning: "TOD via vitreous K+ 6.1 mmol/L, rigor mortis indicators.",
    },
    {
      id: "e-v-weapon",
      source: "victim-1",
      target: "weapon-1",
      label: "Cause of Death Link",
      relationType: "confirmed",
      confidence: 74,
      timestamp: "Recovery 22 Apr 23:00",
      source_ref: "Evidence EV-008",
      reasoning: "Iron rod blood group matches victim. Impact consistent with occipital fracture.",
      danger: true,
    },
    // Victim ↔ Environmental
    {
      id: "e-v-w1",
      source: "victim-1",
      target: "witness-1",
      label: "Witnessed Alive",
      relationType: "environmental",
      confidence: 92,
      timestamp: "20:14 Apr 22",
      source_ref: "Statement W-1",
      reasoning: "Reliable eyewitness confirms victim alive near E-Gate 4 at 20:14.",
    },
    {
      id: "e-v-w2",
      source: "victim-1",
      target: "witness-2",
      label: "Sighting Near TOD",
      relationType: "weak",
      confidence: 58,
      timestamp: "22:10 (disputed)",
      source_ref: "Statement W-2",
      reasoning: "Witness places S-204 at scene at 22:10, inconsistent with phone data.",
      danger: true,
    },
    {
      id: "e-v-family",
      source: "victim-1",
      target: "family-1",
      label: "Last Known Contact",
      relationType: "environmental",
      confidence: 80,
      timestamp: "18:05 Apr 22",
      source_ref: "Family Statement",
      reasoning: "Victim's wife last spoke at 18:05. He mentioned meeting 'an old contact'.",
    },
    {
      id: "e-v-weather",
      source: "victim-1",
      target: "weather-1",
      label: "Environmental Context",
      relationType: "environmental",
      confidence: 95,
      timestamp: "20:00–22:00 Apr 22",
      source_ref: "Weather Log",
      reasoning: "Overcast conditions reduced visibility, affecting CCTV and witness accuracy.",
    },
    {
      id: "e-s2-w2",
      source: "suspect-2",
      target: "witness-2",
      label: "Contradictory Sighting",
      relationType: "suspicious",
      confidence: 58,
      timestamp: "22:10 (disputed)",
      source_ref: "Statement W-2",
      reasoning: "Witness claims S-204 at scene at 22:10 but phone shows no tower activity.",
      danger: true,
    },
  ],
};

export const timelineEvents = [
  { t: "18:10", title: "Victim leaves Jayanagar home", type: "movement", conf: 92 },
  { t: "19:42", title: "UPI transfer ₹40,000 → S-118", type: "financial", conf: 88 },
  { t: "20:14", title: "CCTV — Victim at E-Gate 4", type: "cctv", conf: 95 },
  { t: "20:22", title: "Phone tower overlap V & S-118", type: "phone", conf: 81 },
  { t: "20:42", title: "Altercation captured CCTV-0412", type: "cctv", conf: 90, alert: true },
  { t: "20:48", title: "CCTV-0418 timestamp inconsistency", type: "cctv", conf: 47, alert: true },
  { t: "20:51", title: "Victim phone last ping", type: "phone", conf: 84 },
  { t: "21:30", title: "Estimated TOD upper bound (autopsy)", type: "forensic", conf: 76 },
  { t: "22:14", title: "Vehicle KA-09-AC-4421 leaves area", type: "movement", conf: 72 },
  { t: "23:02", title: "Witness #2 reports altercation", type: "witness", conf: 58 },
];

export const hypotheses = [
  {
    id: "H1",
    title: "Robbery escalated to homicide",
    confidence: 74,
    support: ["UPI ₹40,000 transfer", "Blunt object recovered", "DNA match 99.2%"],
    against: ["No prior record S-118", "Witness places S-204 nearby"],
  },
  {
    id: "H2",
    title: "Victim knew the suspect (S-118)",
    confidence: 81,
    support: ["Phone overlap 4 days prior", "Financial transaction same evening"],
    against: ["No social media link"],
  },
  {
    id: "H3",
    title: "Body relocation likely occurred",
    confidence: 52,
    support: ["Livor mortis inconsistent", "GPS gap 21:00–21:25"],
    against: ["Witness sighting at scene 21:10"],
  },
  {
    id: "H4",
    title: "Estimated TOD differs from witness statement",
    confidence: 67,
    support: ["Vitreous K+ 6.1 mmol/L", "Stomach contents partial digestion"],
    against: ["Witness #2 timeline coarse"],
  },
];

export const contradictions = [
  { id: "X1", text: "CCTV-0418 timestamp drift +6m vs station clock", severity: "high" },
  { id: "X2", text: "Witness #2 places suspect at 22:10 — phone was off-tower", severity: "high" },
  {
    id: "X3",
    text: "GPS travel from City Station → Shivajinagar in 4m (impossible)",
    severity: "critical",
  },
  { id: "X4", text: "Livor mortis fixed pattern vs supine recovery position", severity: "medium" },
];

export const autopsy = {
  caseId: "C-2041",
  subject: "R. Suresh, M, 34",
  causeOfDeath: "Blunt force trauma — occipital",
  todRange: "19:30 – 21:00",
  todConfidence: 76,
  indicators: [
    { name: "Algor Mortis", value: "31.4 °C core", note: "≈ 2.5h post-mortem at recovery" },
    { name: "Rigor Mortis", value: "Jaw + neck onset", note: "Early (<4h)" },
    { name: "Livor Mortis", value: "Posterior fixed", note: "Inconsistent w/ position ⚠" },
    { name: "Vitreous Potassium", value: "6.1 mmol/L", note: "Supports 2–4h interval" },
    { name: "Stomach Contents", value: "Partially digested", note: "Meal ≈ 2h pre-mortem" },
    { name: "Entomology", value: "No colonization", note: "Recovery within 4h" },
  ],
  injuries: [
    { region: "head", label: "Occipital impact", severity: "critical" },
    { region: "torso", label: "Defensive bruise — left clavicle", severity: "medium" },
    { region: "arm-l", label: "Defensive abrasion", severity: "low" },
    { region: "leg-r", label: "Post-mortem drag mark", severity: "medium" },
  ],
  toxicology: [
    { sub: "Ethanol", val: "0.04 BAC", flag: false },
    { sub: "Diazepam", val: "Trace", flag: true },
    { sub: "Opioids", val: "Negative", flag: false },
  ],
};

export const evidenceVault = [
  {
    id: "EV-001",
    name: "CCTV-BNG-0412 footage",
    type: "video",
    case: "C-2041",
    priority: 95,
    status: "verified",
    ai: "Altercation visible 20:42",
  },
  {
    id: "EV-002",
    name: "CCTV-BNG-0418 footage",
    type: "video",
    case: "C-2041",
    priority: 88,
    status: "anomaly",
    ai: "Timestamp drift detected",
  },
  {
    id: "EV-003",
    name: "DNA Sample D-77",
    type: "dna",
    case: "C-2041",
    priority: 92,
    status: "verified",
    ai: "Match S-118 99.2%",
  },
  {
    id: "EV-004",
    name: "Autopsy A-2041",
    type: "report",
    case: "C-2041",
    priority: 80,
    status: "review",
    ai: "Livor mortis inconsistent",
  },
  {
    id: "EV-005",
    name: "Phone dump +9198xxx12",
    type: "phone",
    case: "C-2041",
    priority: 76,
    status: "processed",
    ai: "Tower overlap with S-118",
  },
  {
    id: "EV-006",
    name: "UPI Statement Apr-26",
    type: "financial",
    case: "C-2041",
    priority: 70,
    status: "verified",
    ai: "₹40,000 transfer 20:22",
  },
  {
    id: "EV-007",
    name: "Witness statement W-2",
    type: "doc",
    case: "C-2041",
    priority: 55,
    status: "review",
    ai: "Inconsistent with TOD",
  },
];

export const officers = [
  // Karnataka
  { id: "O-101", name: "Insp. R. Karthik", district: "Bengaluru", cases: 7, online: true },
  { id: "O-102", name: "Insp. P. Anitha", district: "Mysuru", cases: 5, online: true },
  { id: "O-103", name: "SI K. Mohan", district: "Hubballi", cases: 4, online: false },
  { id: "O-104", name: "Insp. M. Selvi", district: "Belagavi", cases: 6, online: true },
  { id: "O-105", name: "SI A. Ramesh", district: "Mangaluru", cases: 3, online: true },
  { id: "O-106", name: "Insp. S. Hari", district: "Ballari", cases: 5, online: false },
  { id: "O-107", name: "SI L. Priya", district: "Bengaluru", cases: 4, online: true },
  // Tamil Nadu
  { id: "O-108", name: "Insp. V. Kumar", district: "Chennai", cases: 6, online: true },
  { id: "O-109", name: "Insp. B. Sundaram", district: "Coimbatore", cases: 3, online: false },
  { id: "O-110", name: "SI N. Prakash", district: "Madurai", cases: 4, online: true },
  { id: "O-111", name: "Insp. C. Meena", district: "Trichy", cases: 5, online: true },
];

export const crimeScene = {
  lat: 12.975,
  lng: 77.6,
  label: "Crime Scene · Altercation 20:42 · C-2041",
};

export const movementPath = [
  { lat: 12.95, lng: 77.58, t: "18:10", who: "victim" },
  { lat: 12.9716, lng: 77.5946, t: "20:14", who: "victim" },
  { lat: 12.975, lng: 77.6, t: "20:42", who: "victim" },

  { lat: 12.98, lng: 77.605, t: "20:55", who: "suspect-1" },
  { lat: 12.975, lng: 77.6, t: "20:42", who: "suspect-1" },
  { lat: 12.96, lng: 77.59, t: "21:25", who: "suspect-1" },

  { lat: 12.955, lng: 77.585, t: "19:00", who: "suspect-2" },
  { lat: 12.965, lng: 77.59, t: "20:10", who: "suspect-2" },
  { lat: 12.975, lng: 77.6, t: "20:42", who: "suspect-2" },
];

export const similarCases = [
  {
    id: "C-1908",
    title: "Yeshwanthpur Station Assault",
    similarity: 78,
    traits: ["Same MO", "Adjacent location", "Blunt object"],
  },
  {
    id: "C-1820",
    title: "Sadashivanagar Robbery-Homicide",
    similarity: 71,
    traits: ["UPI lure pattern", "Night-time CCTV gap"],
  },
  {
    id: "C-1755",
    title: "Shivajinagar Body Discovery",
    similarity: 64,
    traits: ["Possible relocation", "Drag marks"],
  },
];
