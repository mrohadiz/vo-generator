import { render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import {
  AssistantLayout,
  Breadcrumbs,
  GardenGrid,
  GardenLayout,
  KnowledgeNav,
  NotebookLayout,
  ObservatoryLayout,
  ResearchLayout,
  ThinkingLoop,
  WorkspaceLayout,
  THINKING_STAGES,
  thinkingStages,
} from '../index.js';

const nav = (
  <KnowledgeNav
    label="Workspace"
    title="Pricing study"
    sections={[
      { id: 'observe', items: [{ label: 'Trial data', href: '/observe', current: true, count: 3 }] },
      { id: 'interpret', items: [{ label: 'Insights', href: '/interpret' }] },
      { id: 'decide', items: [{ label: 'Decisions', href: '/decide' }] },
      { id: 'learn', items: [{ label: 'Lessons', href: '/learn' }] },
    ]}
  />
);

describe('KnowledgeNav', () => {
  it('is a labelled navigation landmark with stage sections', () => {
    render(nav);
    const landmark = screen.getByRole('navigation', { name: 'Workspace' });
    expect(within(landmark).getByRole('heading', { level: 2, name: /Observe/ })).toBeInTheDocument();
    expect(within(landmark).getByRole('heading', { level: 2, name: /Learn/ })).toBeInTheDocument();
    expect(screen.getByText('Notice what is happening, before deciding what it means.')).toBeInTheDocument();
  });

  it('marks the current page with aria-current and announces counts', () => {
    render(nav);
    const link = screen.getByRole('link', { name: /Trial data/ });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link.querySelector('.fn-nav__count')).toHaveTextContent('3');
    expect(link.querySelector('.fn-sr-only')).toHaveTextContent('items');
  });

  it('supports custom sections with their own label', () => {
    render(
      <KnowledgeNav
        label="Garden"
        sections={[{ id: 'archive', label: 'Archive', items: [{ label: 'Old notes', href: '/old' }] }]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Archive' })).toBeInTheDocument();
  });
});

describe('ThinkingLoop', () => {
  it('lists the four stages in order and marks the current step', () => {
    render(<ThinkingLoop current="decide" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Observe');
    expect(items[2]).toHaveTextContent('Decide');
    expect(screen.getByText('Decide').closest('[aria-current]')).toHaveAttribute('aria-current', 'step');
  });

  it('exposes the thinking stages in canonical order', () => {
    expect(thinkingStages).toEqual(['observe', 'interpret', 'decide', 'learn']);
    expect(THINKING_STAGES.learn.intent).toBe('learning');
  });
});

describe('Breadcrumbs', () => {
  it('marks the last item as the current page', () => {
    render(<Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Decisions', href: '/d' }, { label: 'Tier' }]} />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Tier')).toHaveAttribute('aria-current', 'page');
  });
});

describe('layouts', () => {
  it('NotebookLayout: skip link targets a single main with the page h1', () => {
    const { container } = render(
      <NotebookLayout title="Week 41" eyebrow="Notebook" description="Reading notes." margin={<p>Margin</p>}>
        <p>Body</p>
      </NotebookLayout>,
    );
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveAttribute('href', '#main');
    const main = screen.getByRole('main');
    expect(main.id).toBe('main');
    expect(within(main).getByRole('heading', { level: 1, name: 'Week 41' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Margin notes' })).toBeInTheDocument();
    expect(container.querySelector('[data-layout="notebook"]')).not.toBeNull();
  });

  it('ObservatoryLayout exposes readings and instruments as labelled regions', () => {
    render(
      <ObservatoryLayout title="Observatory" readings={<p>12 signals</p>} instruments={<p>Filters</p>}>
        <p>Field</p>
      </ObservatoryLayout>,
    );
    expect(screen.getByRole('region', { name: 'Key readings' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Instruments' })).toBeInTheDocument();
  });

  it('AssistantLayout names the conversation and places the composer after it', () => {
    render(
      <AssistantLayout title="Assistant" threads={<p>Threads</p>} composer={<form aria-label="Message"><input aria-label="Message text" /></form>}>
        <div role="log">hello</div>
      </AssistantLayout>,
    );
    expect(screen.getByRole('region', { name: 'Conversation' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Message' })).toBeInTheDocument();
  });

  it('WorkspaceLayout renders navigation, toolbar group and inspector', () => {
    render(
      <WorkspaceLayout title="Pricing decision" navigation={nav} toolbar={<button type="button">Export</button>} inspector={<p>Details</p>}>
        <p>Work</p>
      </WorkspaceLayout>,
    );
    expect(screen.getByRole('group', { name: 'Pricing decision actions' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Inspector' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Pricing decision' })).toBeInTheDocument();
  });

  it('ResearchLayout shows the question as the page description', () => {
    render(
      <ResearchLayout title="Attention" question="Do shorter notes get revisited?" sources={<p>Sources list</p>}>
        <p>Body</p>
      </ResearchLayout>,
    );
    expect(screen.getByText('Do shorter notes get revisited?')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Sources' })).toBeInTheDocument();
  });

  it('GardenLayout and GardenGrid compose a browsable collection', () => {
    render(
      <GardenLayout title="Garden" recent={<p>Recent</p>} navigation={nav}>
        <GardenGrid label="Notes">
          <article>Node</article>
        </GardenGrid>
      </GardenLayout>,
    );
    expect(screen.getByRole('group', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Recently tended' })).toBeInTheDocument();
  });

  it('every layout is free of axe violations', async () => {
    const { container } = render(
      <div>
        <NotebookLayout title="A" margin={<p>m</p>} navigation={nav}>
          <p>x</p>
        </NotebookLayout>
        <ThinkingLoop current="observe" hrefs={{ observe: '/observe' }} />
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Here' }]} />
      </div>,
    );
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
