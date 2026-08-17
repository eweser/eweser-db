/// <reference types="cypress" />

import type { Editor } from '@tiptap/react';
import {
  summarizeEweNotePerformance,
  type EweNotePerformanceRecord,
} from '../../../packages/ewe-note/src/performance/ewe-note-performance';

const eweNoteUrl = () =>
  (Cypress.env('eweNoteBaseUrl') as string | undefined) ??
  (Cypress.config('baseUrl') as string | undefined) ??
  '';

type BrowserPerformanceEntry = {
  duration: number;
  name: string;
  startTime: number;
};

type BrowserPerformanceState = {
  interactions: BrowserPerformanceEntry[];
  longTasks: BrowserPerformanceEntry[];
  measurementStart: number;
  observers: PerformanceObserver[];
};

declare global {
  interface Window {
    __EWE_NOTE_BROWSER_PERFORMANCE__?: BrowserPerformanceState;
  }
}

function installPerformanceProbe(win: Cypress.AUTWindow) {
  win.__EWE_NOTE_PERFORMANCE__ = { enabled: true, records: [] };
  const state: BrowserPerformanceState = {
    interactions: [],
    longTasks: [],
    measurementStart: 0,
    observers: [],
  };
  win.__EWE_NOTE_BROWSER_PERFORMANCE__ = state;

  const supported = win.PerformanceObserver?.supportedEntryTypes ?? [];
  if (supported.includes('longtask')) {
    const observer = new win.PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        state.longTasks.push({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
        });
      });
    });
    observer.observe({ type: 'longtask', buffered: true });
    state.observers.push(observer);
  }

  if (supported.includes('event')) {
    const observer = new win.PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const eventEntry = entry as PerformanceEntry & {
          interactionId?: number;
        };
        if (!eventEntry.interactionId) return;
        state.interactions.push({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
        });
      });
    });
    observer.observe({
      type: 'event',
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit & { durationThreshold: number });
    state.observers.push(observer);
  }
}

function resetPerformanceProbe(win: Cypress.AUTWindow) {
  const probe = win.__EWE_NOTE_PERFORMANCE__;
  if (probe) probe.records.length = 0;
  const browserState = win.__EWE_NOTE_BROWSER_PERFORMANCE__;
  if (browserState) {
    browserState.interactions.length = 0;
    browserState.longTasks.length = 0;
    browserState.measurementStart = win.performance.now();
  }
  win.performance.clearMeasures();
}

function rounded(value: number) {
  return Number(value.toFixed(2));
}

function buildPerformanceReport(
  win: Cypress.AUTWindow,
  fixture: Record<string, number | string>
) {
  const records = win.__EWE_NOTE_PERFORMANCE__?.records ?? [];
  const browserState = win.__EWE_NOTE_BROWSER_PERFORMANCE__;
  const measurementStart = browserState?.measurementStart ?? 0;
  const interactions = (browserState?.interactions ?? []).filter(
    (entry) => entry.startTime >= measurementStart
  );
  const longTasks = (browserState?.longTasks ?? []).filter(
    (entry) => entry.startTime >= measurementStart
  );

  return {
    browser: `${Cypress.browser.displayName} ${Cypress.browser.majorVersion}`,
    fixture,
    spans: summarizeEweNotePerformance(records).map((summary) => ({
      ...summary,
      median: rounded(summary.median),
      p95: rounded(summary.p95),
      maximum: rounded(summary.maximum),
    })),
    interactions: {
      count: interactions.length,
      maximum: rounded(
        Math.max(0, ...interactions.map((entry) => entry.duration))
      ),
    },
    longTasks: {
      count: longTasks.length,
      maximum: rounded(
        Math.max(0, ...longTasks.map((entry) => entry.duration))
      ),
    },
  };
}

function assertPerformanceBudgets(
  report: ReturnType<typeof buildPerformanceReport>,
  records: readonly EweNotePerformanceRecord[]
) {
  const overBudgetSpans = records.filter(
    (record) =>
      record.thread === 'main' && record.blocking && record.duration > 50
  );
  expect(
    overBudgetSpans.map(({ name, duration }) => ({
      name,
      duration: rounded(duration),
    })),
    'Ewe Note-owned synchronous spans over 50 ms'
  ).to.deep.equal([]);
  if (report.interactions.count > 0) {
    expect(
      report.interactions.maximum,
      'maximum observed interaction'
    ).to.be.at.most(200);
  }
}

describe('ewe-note editor performance', () => {
  it('keeps typing responsive in a long rich-text note', () => {
    const paragraphCount = Cypress.env('eweNoteExtendedPerformance')
      ? 10000
      : 2500;
    let activeEditor: Editor | null = null;
    let editorGetJsonCalls = 0;

    cy.visit(eweNoteUrl(), {
      onBeforeLoad(win) {
        win.localStorage.clear();
        installPerformanceProbe(win);
        win.addEventListener('ewe-note-editor-focus', (event) => {
          activeEditor = (event as CustomEvent<{ editor: Editor }>).detail
            .editor;
        });
      },
    });

    cy.getBySel('ewe-note-sidebar', { timeout: 10000 }).should('exist');
    cy.getBySel('ewe-note-new-note').first().click();
    cy.getBySel('ewe-note-tiptap-editor', { timeout: 10000 }).click();
    cy.then(() => {
      expect(activeEditor, 'active TipTap editor').not.to.equal(null);
      activeEditor?.commands.setContent(
        {
          type: 'doc',
          content: Array.from({ length: paragraphCount }, (_, index) => ({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Paragraph ${
                  index + 1
                }: local-first editing should stay responsive even when a note has a lot of content.`,
              },
            ],
          })),
        },
        false
      );
    });

    cy.getBySel('ewe-note-tiptap-editor').should(
      'contain',
      `Paragraph ${paragraphCount}`
    );
    cy.wait(600);
    cy.window().then((win) => {
      resetPerformanceProbe(win);
      if (!activeEditor) throw new Error('TipTap editor was not ready');
      const originalGetJson = activeEditor.getJSON.bind(activeEditor);
      activeEditor.getJSON = () => {
        editorGetJsonCalls += 1;
        return originalGetJson();
      };
      activeEditor?.commands.focus('end');
    });
    cy.getBySel('ewe-note-tiptap-editor').type('responsive-input-burst', {
      force: true,
    });
    cy.then(() => {
      expect(editorGetJsonCalls, 'synchronous whole-document reads').to.equal(
        0
      );
    });
    cy.wait(900);
    cy.then(() => {
      expect(editorGetJsonCalls, 'debounced whole-document reads').to.equal(1);
    });
    cy.getBySel('ewe-note-editor-menu-trigger').click();
    cy.contains('[role="menuitem"]', 'Edit raw Markdown').click();
    cy.getBySel('ewe-note-source-editor')
      .should('contain.value', `Paragraph ${paragraphCount}`)
      .and('contain.value', 'responsive-input-burst');
    cy.get('button[aria-label="Return to rich editor"]').click();
    cy.getBySel('ewe-note-tiptap-editor', { timeout: 20000 })
      .should('contain', `Paragraph ${paragraphCount}`)
      .and('contain', 'responsive-input-burst');
    cy.window().then((win) => {
      const report = buildPerformanceReport(win, {
        paragraphs: paragraphCount,
        typedCharacters: 22,
        modeTransitions: 2,
      });
      assertPerformanceBudgets(
        report,
        win.__EWE_NOTE_PERFORMANCE__?.records ?? []
      );
      cy.writeFile(
        'e2e/cypress/screenshots/ewe-note-editor-performance-baseline.json',
        report
      );
      cy.log(JSON.stringify(report.spans));
    });
    cy.reload();
    cy.getBySel('ewe-note-tiptap-editor', { timeout: 10000 })
      .should('contain', `Paragraph ${paragraphCount}`)
      .and('contain', 'a lot of content.responsive-input-burst');
    cy.screenshot('ewe-note-editor-performance-long-note');
    cy.viewport(390, 844);
    cy.getBySel('ewe-note-tiptap-editor').should('be.visible');
    cy.window().then((win) => {
      expect(
        win.document.documentElement.scrollWidth,
        'narrow viewport horizontal fit'
      ).to.be.at.most(win.innerWidth);
    });
    cy.screenshot('ewe-note-editor-performance-long-note-narrow');
  });

  it('attributes Links analysis against a large synthetic note corpus', () => {
    const extended = Boolean(Cypress.env('eweNoteExtendedPerformance'));
    const targetCount = extended ? 1000 : 400;
    const paragraphCount = extended ? 10000 : 2500;
    cy.visit(eweNoteUrl(), {
      onBeforeLoad(win) {
        win.localStorage.clear();
        installPerformanceProbe(win);
      },
    });

    cy.getBySel('ewe-note-sidebar', { timeout: 10000 }).should('exist');
    cy.window()
      .its('__EWE_NOTE_PERFORMANCE_DRIVER__', { timeout: 10000 })
      .should('exist');
    cy.window().then((win) => {
      const result = win.__EWE_NOTE_PERFORMANCE_DRIVER__?.seedSyntheticCorpus({
        targetCount,
        bodyParagraphs: paragraphCount,
      });
      expect(result, 'synthetic corpus result').not.to.equal(undefined);
      const editorUrl = new URL(
        `/editor/${result?.analysisNoteId ?? ''}`,
        eweNoteUrl()
      ).href;
      cy.visit(editorUrl, {
        onBeforeLoad(nextWin) {
          installPerformanceProbe(nextWin);
        },
      });
    });

    cy.getBySel('ewe-note-tiptap-editor', { timeout: 20000 })
      .should('contain', `Synthetic analysis paragraph ${paragraphCount}`)
      .then(() => {
        cy.window().then(resetPerformanceProbe);
      });
    cy.get('body').type('{ctrl}4');
    cy.getBySel('ewe-note-right-panel', { timeout: 10000 })
      .should('be.visible')
      .find('[role="tab"]')
      .contains('Links')
      .click();
    cy.contains('Unlinked Mentions (1)', { timeout: 20000 }).should(
      'be.visible'
    );

    cy.window().then((win) => {
      const report = buildPerformanceReport(win, {
        targetNotes: targetCount,
        paragraphs: paragraphCount,
      });
      const records = win.__EWE_NOTE_PERFORMANCE__?.records ?? [];
      if (!Cypress.env('eweNotePerformanceBaseline')) {
        assertPerformanceBudgets(report, records);
      }
      cy.writeFile(
        'e2e/cypress/screenshots/ewe-note-editor-performance-links.json',
        report
      );
      cy.log(JSON.stringify(report.spans));
    });
    cy.screenshot('ewe-note-editor-performance-links');
  });
});
