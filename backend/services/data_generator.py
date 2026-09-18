"""
Case fixture data (timeline + movement) for the demo case file.

`generate_timeline` / `generate_movement` previously declared a `case_id`
parameter and then ignored it entirely, returning the same hardcoded C-2041
data for every id — `/api/cases/ANYTHING/timeline` answered as if that case
existed. They now honour the id and return None for cases they do not have,
so the router can raise a real 404.
"""

from datetime import datetime, timedelta

# Fixed reference date so fixtures are deterministic across runs and tests.
# Previously this was datetime.now(), frozen at import time.
_BASE = datetime(2026, 1, 1, 18, 0, 0)

# Cases this module actually holds evidence for.
KNOWN_CASES = {"C-2041"}


def _t(h=0, m=0):
    return (_BASE + timedelta(hours=h, minutes=m)).strftime("%H:%M")


def case_exists(case_id: str) -> bool:
    return case_id.strip().upper() in KNOWN_CASES


def generate_timeline(case_id: str):
    """18-step investigation roadmap. Returns None for an unknown case id."""
    if not case_exists(case_id):
        return None
    return [
        {
            "id": 1,
            "time": _t(0, 10),
            "title": "Victim Leaves Home",
            "eventType": "movement",
            "description": "Arjun Sharma departs Triplicane residence on foot. Door camera records departure at 18:10.",
            "confidence": 92,
            "severity": "low",
            "aiInsight": "Normal departure pattern. No anomalies flagged at this stage.",
        },
        {
            "id": 2,
            "time": _t(0, 22),
            "title": "UPI Transfer Initiated",
            "eventType": "financial",
            "description": "₹40,000 UPI transfer from victim's account to S-118 (Ravi Kumar). Transaction routed via HDFC node.",
            "confidence": 95,
            "severity": "medium",
            "aiInsight": "Unusually large transfer 8 minutes after departure. Financial motive hypothesis strengthened.",
        },
        {
            "id": 3,
            "time": _t(1, 15),
            "title": "CCTV: Landmark Hotel Lobby",
            "eventType": "cctv",
            "description": "Victim enters Landmark Hotel lobby. Appears to meet unknown individual. Partial face match with S-119.",
            "confidence": 78,
            "severity": "medium",
            "aiInsight": "Partial face-match confidence 78%. Second suspect contact unconfirmed — flagged for manual review.",
        },
        {
            "id": 4,
            "time": _t(1, 42),
            "title": "Phone Tower Overlap",
            "eventType": "phone",
            "description": "Victim and S-118 phones ping identical cell tower (Tower ID: TN-MAS-0042) within 12-minute window.",
            "confidence": 88,
            "severity": "high",
            "aiInsight": "Proximity confirmed within 500 m radius. Opportunity window opens.",
        },
        {
            "id": 5,
            "time": _t(2, 5),
            "title": "CCTV: Chennai Central E-Gate 4",
            "eventType": "cctv",
            "description": "High-confidence CCTV match at Chennai Central E-Gate 4. Victim boards Platform 7 direction.",
            "confidence": 96,
            "severity": "low",
            "aiInsight": "Trajectory consistent with movement toward the crime scene. Timestamp anchor established.",
        },
        {
            "id": 6,
            "time": _t(2, 34),
            "title": "DNA Sample Collected",
            "eventType": "forensic",
            "description": "Foreign DNA recovered from victim's right hand (sub-ungual scrapings). Mitochondrial profile generated.",
            "confidence": 91,
            "severity": "high",
            "aiInsight": "DNA profile does not match victim. Partial match (6/13 STR loci) with S-118 reference sample.",
        },
        {
            "id": 7,
            "time": _t(2, 48),
            "title": "Toxicology Screen Initiated",
            "eventType": "forensic",
            "description": "Post-mortem blood draw sent to CFSL. Preliminary screen flags elevated phenobarbital levels.",
            "confidence": 82,
            "severity": "high",
            "aiInsight": "Sedative detected pre-mortem. Incapacitation prior to lethal event is probable.",
        },
        {
            "id": 8,
            "time": _t(3, 10),
            "title": "Weapon Recovered",
            "eventType": "forensic",
            "description": "Iron rod (87 cm, 1.2 kg) recovered from drain 40 m from scene. Blood-type A+ confirmed. Partial fingerprint.",
            "confidence": 89,
            "severity": "critical",
            "aiInsight": "Weapon trajectory analysis places grip point consistent with right-handed male 170–180 cm tall.",
        },
        {
            "id": 9,
            "time": _t(3, 30),
            "title": "Autopsy: Blunt Force Trauma",
            "eventType": "autopsy",
            "description": "Primary COD: blunt force trauma to occipital region. 3 impact sites identified. No defensive wounds.",
            "confidence": 97,
            "severity": "critical",
            "aiInsight": "Absence of defensive wounds suggests victim was incapacitated (consistent with toxicology finding).",
        },
        {
            "id": 10,
            "time": _t(4, 0),
            "title": "PMI Calculated",
            "eventType": "forensic",
            "description": "Vitreous potassium: 12.88 mmol/L. PMI estimated 11.2 ± 1.4 hours. Algor Mortis corroborates.",
            "confidence": 85,
            "severity": "medium",
            "aiInsight": "PMI window 20:15–21:45. Narrows suspect opportunity to 90-minute corridor.",
        },
        {
            "id": 11,
            "time": _t(4, 20),
            "title": "Witness Statement: Auto Driver",
            "eventType": "witness",
            "description": "Auto driver (W-04) reports picking up fare matching S-118 description at Central Station at 20:55.",
            "confidence": 74,
            "severity": "medium",
            "aiInsight": "Eyewitness confidence moderate. Corroborates phone tower ping at 20:42. Alibi weakened.",
        },
        {
            "id": 12,
            "time": _t(4, 45),
            "title": "S-118 Alibi Cross-Check",
            "eventType": "suspect",
            "description": "S-118 claims gym attendance 20:00–21:30. CCTV at gym shows no entry log. Alibi unverified.",
            "confidence": 93,
            "severity": "critical",
            "aiInsight": "Alibi falsified with 93% confidence. S-118 opportunity window fully open during PMI corridor.",
        },
        {
            "id": 13,
            "time": _t(5, 10),
            "title": "Financial Motive Confirmed",
            "eventType": "financial",
            "description": "₹40k transfer traced to loan repayment. Victim held promissory note worth ₹4.2L against S-118.",
            "confidence": 88,
            "severity": "high",
            "aiInsight": "Debt elimination motive confirmed. Motive + opportunity + weapon = strong prosecution case.",
        },
        {
            "id": 14,
            "time": _t(5, 40),
            "title": "AI Hypothesis Generated",
            "eventType": "ai_hypothesis",
            "description": "Watson-Board synthesizes all 13 evidence threads into unified hypothesis: premeditated homicide with financial motive.",
            "confidence": 91,
            "severity": "critical",
            "aiInsight": "Primary hypothesis: S-118 administered sedative, transported victim to scene, inflicted fatal blows. Confidence: 91%.",
        },
        {
            "id": 15,
            "time": _t(6, 0),
            "title": "Movement Reconstruction",
            "eventType": "movement",
            "description": "AI reconstructs victim and S-118 movement paths from 18:10–21:00 using 9 GPS anchors and 5 CCTV timestamps.",
            "confidence": 87,
            "severity": "high",
            "aiInsight": "Both paths converge at Chennai Central at 20:38 ± 4 min. Convergence probability: 94%.",
        },
        {
            "id": 16,
            "time": _t(6, 20),
            "title": "Contradiction Detected",
            "eventType": "contradiction",
            "description": "S-118 claims no financial relationship with victim. Bank records and promissory note directly contradict this.",
            "confidence": 96,
            "severity": "critical",
            "aiInsight": "Contradiction flagged. Statement inconsistency elevates deception probability to 96%.",
        },
        {
            "id": 17,
            "time": _t(6, 45),
            "title": "Evidence Corroboration Complete",
            "eventType": "forensic",
            "description": "All 8 physical evidence items cross-corroborated. DNA, fingerprint, toxicology, and weapon form consistent chain.",
            "confidence": 94,
            "severity": "high",
            "aiInsight": "Chain-of-custody verified. No evidence contamination detected. Ready for prosecution review.",
        },
        {
            "id": 18,
            "time": _t(7, 0),
            "title": "Final AI Narrative",
            "eventType": "narrative",
            "description": "Watson-Board generates final investigative narrative consolidating all evidence threads for prosecution briefing.",
            "confidence": 91,
            "severity": "critical",
            "aiInsight": "Case strength: STRONG. Recommend arrest warrant for S-118. Secondary lead: S-119 facial match requires follow-up.",
        },
    ]


def generate_movement(case_id: str):
    """GPS anchor points for victim and suspects. None for an unknown case id."""
    if not case_exists(case_id):
        return None
    return [
        {"lat": 13.0560, "lng": 80.2620, "label": "Victim's Residence", "time": "18:10", "type": "victim"},
        {"lat": 13.0650, "lng": 80.2650, "label": "S-118 Last Known Location", "time": "19:00", "type": "suspect"},
        {"lat": 13.0700, "lng": 80.2680, "label": "Landmark Hotel", "time": "19:15", "type": "victim"},
        {"lat": 13.0750, "lng": 80.2700, "label": "S-119 Café Meeting", "time": "20:10", "type": "suspect"},
        {"lat": 13.0820, "lng": 80.2730, "label": "Chennai Central Station", "time": "20:14", "type": "victim"},
        {"lat": 13.0825, "lng": 80.2750, "label": "Crime Scene", "time": "20:42", "type": "crime"},
        {"lat": 13.0900, "lng": 80.2800, "label": "S-118 Flee Route North", "time": "20:55", "type": "suspect"},
        {"lat": 13.0700, "lng": 80.2700, "label": "S-118 Phone Tower Ping", "time": "21:25", "type": "suspect"},
        {"lat": 13.0560, "lng": 80.2620, "label": "S-118 Returns Home", "time": "22:10", "type": "suspect"},
    ]
