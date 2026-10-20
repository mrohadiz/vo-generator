'use client';

import { createIcon } from './create-icon.js';

/* ── Intent glyphs ─────────────────────────────────────────── */

/** Observation — an open eye: noticing what is there. */
export const ObservationIcon = createIcon(
  'ObservationIcon',
  <>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

/** Evidence — a document with lines: something that can be checked. */
export const EvidenceIcon = createIcon(
  'EvidenceIcon',
  <>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
    <path d="M9 12h6M9 15.5h6M9 19h3.5" />
  </>,
);

/** Insight — a spark radiating from a centre: a pattern that connects. */
export const InsightIcon = createIcon(
  'InsightIcon',
  <>
    <circle cx="12" cy="12" r="3.25" />
    <path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M6 18l1.8-1.8M16.2 7.8 18 6" />
  </>,
);

/** Decision — a fork in the path with a chosen branch. */
export const DecisionIcon = createIcon(
  'DecisionIcon',
  <>
    <circle cx="6" cy="5.5" r="2" />
    <circle cx="6" cy="18.5" r="2" />
    <circle cx="18" cy="12" r="2" />
    <path d="M6 7.5v9" />
    <path d="M6 12c0-2.5 2.5-0 10 0" />
  </>,
);

/** Learning — a sprouting seedling: understanding that grows. */
export const LearningIcon = createIcon(
  'LearningIcon',
  <>
    <path d="M12 21v-8.5" />
    <path d="M12 12.5C12 8.5 9.5 6 5 5.5c0 4 2.5 7 7 7Z" />
    <path d="M12 14.5c0-3.2 2-5.5 6.5-6 0 3.5-2.3 6-6.5 6Z" />
  </>,
);

/* ── Utility glyphs ────────────────────────────────────────── */

export const ChevronRightIcon = createIcon('ChevronRightIcon', <path d="m9 6 6 6-6 6" />);
export const ArrowRightIcon = createIcon(
  'ArrowRightIcon',
  <>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </>,
);
export const CloseIcon = createIcon('CloseIcon', <path d="M6 6l12 12M18 6 6 18" />);
export const CheckIcon = createIcon('CheckIcon', <path d="m5 12.5 4.5 4.5L19 7.5" />);
export const WarningIcon = createIcon(
  'WarningIcon',
  <>
    <path d="M12 4 21 19.5H3z" />
    <path d="M12 10v4.5M12 17.2v.1" />
  </>,
);
export const ClockIcon = createIcon(
  'ClockIcon',
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
);
export const LinkIcon = createIcon(
  'LinkIcon',
  <>
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  </>,
);
export const PlusIcon = createIcon('PlusIcon', <path d="M12 5v14M5 12h14" />);
export const SearchIcon = createIcon(
  'SearchIcon',
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </>,
);
export const NoteIcon = createIcon(
  'NoteIcon',
  <>
    <path d="M5 4h14v16H5z" />
    <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
  </>,
);
