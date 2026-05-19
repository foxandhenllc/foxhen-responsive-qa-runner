export const sample = {
  "repoName": "foxhen-responsive-qa-runner",
  "title": "Responsive QA Runner",
  "subtitle": "Visual bug sprint sample",
  "serviceLine": "Website QA and polish",
  "heroTitle": "Find responsive defects before a lead sees them.",
  "heroCopy": "A simulated QA runner with breakpoint cards, reproduction steps, defect severity, acceptance checks, and a closeout report for a fictional site.",
  "primaryAction": "Run QA pass",
  "secondaryAction": "Open defect log",
  "repositoryUrl": "https://github.com/foxandhenllc/foxhen-responsive-qa-runner",
  "liveDemoUrl": "https://foxhen-responsive-qa-runner.vercel.app",
  "theme": {
    "accent": "#1c6571",
    "accent2": "#ef7f6d",
    "ink": "#06171a",
    "soft": "#e8f8fa",
    "warm": "#ffe9e4",
    "surface": "#fffaf4",
    "muted": "#5c667a",
    "border": "rgba(7, 18, 31, 0.12)"
  },
  "metrics": [
    {
      "label": "Breakpoints tested",
      "value": "6",
      "note": "desktop to mobile"
    },
    {
      "label": "Defects logged",
      "value": "17",
      "note": "ranked"
    },
    {
      "label": "Acceptance pass",
      "value": "88%",
      "note": "+24 pts"
    }
  ],
  "stages": [
    {
      "label": "Capture",
      "detail": "Record viewport, device class, reproduction path, and visible issue.",
      "status": "ready",
      "owner": "QA",
      "index": 1
    },
    {
      "label": "Rank",
      "detail": "Score severity by conversion impact, readability, and layout damage.",
      "status": "active",
      "owner": "Studio",
      "index": 2
    },
    {
      "label": "Fix",
      "detail": "Track before-after notes and unresolved dependencies.",
      "status": "waiting",
      "owner": "Dev",
      "index": 3
    },
    {
      "label": "Accept",
      "detail": "Package a client-ready summary with screenshots and checks.",
      "status": "queued",
      "owner": "Ops",
      "index": 4
    }
  ],
  "workItems": [
    {
      "title": "Mobile nav",
      "detail": "Menu label wraps below 390px",
      "status": "ready"
    },
    {
      "title": "CTA contrast",
      "detail": "Primary button fails in hover state",
      "status": "active"
    },
    {
      "title": "Hero image",
      "detail": "Waiting on source asset replacement",
      "status": "waiting"
    },
    {
      "title": "Closeout report",
      "detail": "Queued after final pass",
      "status": "queued"
    }
  ],
  "deliverables": [
    {
      "title": "Defect board",
      "detail": "Severity, viewport, reproduction, and acceptance state."
    },
    {
      "title": "Fix log",
      "detail": "Before-after notes for each resolved issue."
    },
    {
      "title": "QA report",
      "detail": "A concise summary suitable for a 24-hour bugfix offer."
    }
  ],
  "timeline": [
    {
      "time": "0-2 hrs",
      "detail": "Baseline capture and breakpoint sweep"
    },
    {
      "time": "2-12 hrs",
      "detail": "Fix highest-impact defects"
    },
    {
      "time": "12-24 hrs",
      "detail": "Verify, screenshot, and package"
    }
  ],
  "proof": [
    "Directly supports 24-hour website bugfix and polish offers.",
    "Makes visual QA evidence easy for a prospect to understand.",
    "Uses sample defects only."
  ]
} as const;

export type StageStatus = "ready" | "active" | "waiting" | "queued";
export type DemoStage = (typeof sample.stages)[number];
export type WorkItem = (typeof sample.workItems)[number];
