/**
 * @fieldnote-ui/ui — components for thinking.
 *
 * Import the stylesheet once: `import '@fieldnote-ui/ui/styles.css'`
 * (plus `@fieldnote-ui/theme/styles.css` for tokens and base styles).
 */

// Semantic cards — the five first-class primitives.
export { ObservationCard, type ObservationCardProps } from './cards/observation-card.js';
export { EvidenceCard, type EvidenceCardProps, type EvidenceSource, type EvidenceStrength, type SourceKind } from './cards/evidence-card.js';
export { InsightCard, type InsightCardProps } from './cards/insight-card.js';
export { DecisionCard, type DecisionCardProps, type DecisionStatus, DECISION_STATUS } from './cards/decision-card.js';
export { LearningCard, type LearningCardProps, type LearningOutcome, LEARNING_OUTCOME } from './cards/learning-card.js';

// Knowledge and research primitives.
export { FieldNote, type FieldNoteProps } from './cards/field-note.js';
export { NotebookCard, type NotebookCardProps } from './cards/notebook-card.js';
export { ExperimentCard, type ExperimentCardProps, type ExperimentStatus, EXPERIMENT_STATUS } from './cards/experiment-card.js';
export { ResearchCard, type ResearchCardProps, type ResearchStatus, RESEARCH_STATUS } from './cards/research-card.js';
export { KnowledgeNode, type KnowledgeNodeProps } from './cards/knowledge-node.js';
export { InsightCluster, type InsightClusterProps, type ClusterInsight } from './cards/insight-cluster.js';
export { LearningRecord, type LearningRecordProps } from './cards/learning-record.js';

// Structures.
export { EvidenceTimeline, type EvidenceTimelineProps, type TimelineItem } from './timeline/evidence-timeline.js';
export { DecisionPanel, type DecisionPanelProps, type DecisionOption, type DecisionResult } from './panels/decision-panel.js';

// Primitives.
export { IntentBadge, type IntentBadgeProps } from './primitives/intent-badge.js';
export { StatusChip, type StatusChipProps } from './primitives/status-chip.js';
export { Tag, type TagProps } from './primitives/tag.js';
export { Meter, type MeterProps } from './primitives/meter.js';
export { Button, type ButtonProps } from './primitives/button.js';
export { ThemeToggle, type ThemeToggleProps } from './primitives/theme-toggle.js';

// Shared types.
export { type HeadingLevel, type DateInput, type Tone, INTENT_LABELS, formatDate } from './shared.js';
