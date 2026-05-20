export type ItemStatus = "backlog" | "active" | "blocked" | "ready" | "done";

export type WorkItem = {
  id: string;
  title: string;
  category: string;
  owner: string;
  status: ItemStatus;
  priority: number;
  effort: number;
  friction: number;
  value: number;
  due: string;
  notes: string;
};

export type QualityCheck = {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
};

export const sample: {
  repoName: string;
  title: string;
  subtitle: string;
  serviceLine: string;
  description: string;
  repositoryUrl: string;
  liveDemoUrl: string;
  theme: { accent: string; accent2: string; ink: string; soft: string; warm: string };
  items: WorkItem[];
  checks: QualityCheck[];
  deliverables: string[];
} = {
  "repoName": "foxhen-responsive-qa-runner",
  "title": "Responsive QA Runner",
  "subtitle": "QA defect board",
  "serviceLine": "Website QA and polish",
  "description": "Run a simulated visual QA pass with breakpoints, defects, reproduction steps, and acceptance checks.",
  "repositoryUrl": "https://github.com/foxandhenllc/foxhen-responsive-qa-runner",
  "liveDemoUrl": "https://foxhen-responsive-qa-runner.vercel.app",
  "theme": {
    "accent": "#1c6571",
    "accent2": "#ef7f6d",
    "ink": "#06171a",
    "soft": "#e8f8fa",
    "warm": "#ffe9e4"
  },
  "items": [
    {
      "id": "res-1",
      "title": "Mobile nav",
      "category": "Intake",
      "owner": "Chris",
      "status": "active",
      "priority": 5,
      "effort": 2,
      "friction": 1,
      "value": 5,
      "due": "Today",
      "notes": "Sample QA defect board work item for website qa and polish."
    },
    {
      "id": "res-2",
      "title": "CTA contrast",
      "category": "Build",
      "owner": "Fox & Hen",
      "status": "backlog",
      "priority": 4,
      "effort": 4,
      "friction": 2,
      "value": 4,
      "due": "24h",
      "notes": "Sample QA defect board work item for website qa and polish."
    },
    {
      "id": "res-3",
      "title": "Hero image",
      "category": "Review",
      "owner": "Buyer",
      "status": "blocked",
      "priority": 3,
      "effort": 3,
      "friction": 4,
      "value": 4,
      "due": "48h",
      "notes": "Sample QA defect board work item for website qa and polish."
    },
    {
      "id": "res-4",
      "title": "Card wrapping",
      "category": "Export",
      "owner": "Automation",
      "status": "ready",
      "priority": 4,
      "effort": 2,
      "friction": 2,
      "value": 3,
      "due": "This week",
      "notes": "Sample QA defect board work item for website qa and polish."
    },
    {
      "id": "res-5",
      "title": "Footer overflow",
      "category": "Intake",
      "owner": "QA",
      "status": "backlog",
      "priority": 2,
      "effort": 1,
      "friction": 1,
      "value": 3,
      "due": "Waiting",
      "notes": "Sample QA defect board work item for website qa and polish."
    },
    {
      "id": "res-6",
      "title": "Closeout report",
      "category": "Build",
      "owner": "Chris",
      "status": "done",
      "priority": 5,
      "effort": 5,
      "friction": 3,
      "value": 5,
      "due": "Next pass",
      "notes": "Sample QA defect board work item for website qa and polish."
    }
  ],
  "checks": [
    {
      "id": "payer",
      "label": "Payer or owner is clear",
      "passed": true,
      "weight": 18
    },
    {
      "id": "deliverable",
      "label": "Deliverable has acceptance criteria",
      "passed": true,
      "weight": 18
    },
    {
      "id": "friction",
      "label": "Account/access friction is documented",
      "passed": false,
      "weight": 14
    },
    {
      "id": "handoff",
      "label": "Handoff package is generated",
      "passed": false,
      "weight": 16
    },
    {
      "id": "reuse",
      "label": "Repeatable pipeline note exists",
      "passed": true,
      "weight": 12
    }
  ],
  "deliverables": [
    "Ranked board",
    "Editable item inspector",
    "Readiness checklist",
    "Exportable handoff report"
  ]
};
