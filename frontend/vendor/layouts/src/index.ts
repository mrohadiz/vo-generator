/**
 * @fieldnote-ui/layouts — page structures for thinking.
 *
 * Each layout renders a skip link and a single <main>. Import the stylesheet
 * once: `import '@fieldnote-ui/layouts/styles.css'`.
 */
export { NotebookLayout, type NotebookLayoutProps } from './layouts/notebook-layout.js';
export { ObservatoryLayout, type ObservatoryLayoutProps } from './layouts/observatory-layout.js';
export { AssistantLayout, type AssistantLayoutProps } from './layouts/assistant-layout.js';
export { WorkspaceLayout, type WorkspaceLayoutProps } from './layouts/workspace-layout.js';
export { ResearchLayout, type ResearchLayoutProps } from './layouts/research-layout.js';
export { GardenLayout, GardenGrid, type GardenLayoutProps, type GardenGridProps } from './layouts/garden-layout.js';
export { PageHeader, type PageHeaderProps } from './layouts/page-header.js';
export { SkipLink, type SkipLinkProps } from './skip-link.js';
export {
  KnowledgeNav,
  type KnowledgeNavProps,
  type KnowledgeNavItem,
  type KnowledgeNavSection,
  ThinkingLoop,
  type ThinkingLoopProps,
  Breadcrumbs,
  type BreadcrumbsProps,
  type BreadcrumbItem,
  THINKING_STAGES,
  thinkingStages,
  type ThinkingStage,
  type ThinkingStageMeta,
} from './navigation/index.js';
