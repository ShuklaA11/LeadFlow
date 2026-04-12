/* eslint-disable @typescript-eslint/no-explicit-any */
// Stress test for wiki sub-tasks 1-3.
// Tests context builders, prompt templates, and compile orchestrator directly
// against a real database.

import { prisma } from '../src/lib/db';
import {
  buildCompanyContext,
  buildLeadContext,
  buildCallContext,
  buildProjectContext,
  buildTopicContext,
} from '../src/lib/wiki/context';
import {
  companyPrompt,
  personPrompt,
  callPrompt,
  projectIndexPrompt,
  topicPrompt,
  topicDiscoveryPrompt,
} from '../src/lib/wiki/prompts';
import { compileProject, type GeneratorRegistry } from '../src/lib/wiki/compile';
import type { WriteDocResult } from '../src/lib/wiki/store';
import { companyIndexPath, personPath, callPath, topicPath, projectIndexPath } from '../src/lib/wiki/paths';

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log('  \x1b[32m✓\x1b[0m ' + name);
  } else {
    failed++;
    const err = name + (detail ? ' — ' + detail : '');
    errors.push(err);
    console.log('  \x1b[31m✗\x1b[0m ' + err);
  }
}

function section(title: string) {
  console.log('\n\x1b[1m--- ' + title + ' ---\x1b[0m');
}

async function main() {
  console.log('\x1b[1m=== Wiki Sub-task 3 Module Stress Test ===\x1b[0m');

  // === Setup: clean slate + fixture data ===
  section('Setup');

  // Create project
  const project = await prisma.project.create({
    data: { name: 'Stress Test Project', description: 'automated test fixture', wikiEnabled: true },
  });
  assert('Create project', !!project.id);

  // Create 2 leads at same company
  const lead1 = await prisma.lead.create({
    data: {
      projectId: project.id,
      firstName: 'Alice',
      lastName: 'Anderson',
      company: 'Acme Corp',
      title: 'VP Engineering',
      role: 'VP',
      email: 'alice@acme.test',
      currentStage: 'MEETING_BOOKED',
      priorityScore: 85,
    },
  });
  const lead2 = await prisma.lead.create({
    data: {
      projectId: project.id,
      firstName: 'Bob',
      lastName: 'Brown',
      company: 'Acme Corp',
      title: 'CTO',
      role: 'C_SUITE',
      email: 'bob@acme.test',
      currentStage: 'RESPONDED',
      priorityScore: 92,
    },
  });
  // Lead at a different company
  const lead3 = await prisma.lead.create({
    data: {
      projectId: project.id,
      firstName: 'Carol',
      lastName: 'Chen',
      company: 'Globex Inc',
      title: 'Director of Ops',
      role: 'DIRECTOR',
      currentStage: 'CONTACTED',
      priorityScore: 60,
    },
  });
  assert('Created 3 leads across 2 companies', !!(lead1 && lead2 && lead3));

  // Calls with structured notes (covering multiple topic keywords)
  const call1 = await prisma.call.create({
    data: {
      leadId: lead1.id,
      title: 'Intro with Alice',
      callDate: new Date('2026-03-01T10:00:00Z'),
      durationMinutes: 30,
      transcript: 'Alice: We looked at your pricing and it seems expensive compared to our current vendor.',
      sentiment: 'NEUTRAL',
      structuredNotes: {
        summary: 'Discussed pricing concerns and competitive positioning',
        keyPoints: ['Pricing is high vs competitors', 'Current vendor is Salesforce', 'Use case fit is strong'],
        quotes: ['Your pricing seems expensive compared to what we have now'],
        objections: ['Price point too high', 'Budget constraints this quarter'],
        validationSignals: ['Problem is real', 'They have allocated budget'],
        commitments: ['Follow up in two weeks'],
        nextSteps: ['Send ROI analysis'],
        sentiment: 'neutral',
        sentimentScore: 0,
      },
    },
  });
  const call2 = await prisma.call.create({
    data: {
      leadId: lead1.id,
      title: 'ROI followup with Alice',
      callDate: new Date('2026-03-15T10:00:00Z'),
      durationMinutes: 45,
      sentiment: 'POSITIVE',
      structuredNotes: {
        summary: 'ROI analysis well received, moving to demo phase',
        keyPoints: ['Strong fit for our ICP', 'Ideal use case'],
        quotes: ['This actually makes the cost worth it'],
        objections: [],
        validationSignals: ['Ready to move forward', 'Budget approved'],
        commitments: ['Schedule demo next week'],
        nextSteps: ['Book demo'],
        sentiment: 'positive',
        sentimentScore: 0.7,
      },
    },
  });
  const call3 = await prisma.call.create({
    data: {
      leadId: lead3.id,
      title: 'Discovery with Carol',
      callDate: new Date('2026-03-20T14:00:00Z'),
      durationMinutes: 20,
      sentiment: 'NEGATIVE',
      structuredNotes: {
        summary: 'Not a fit right now',
        keyPoints: ['Already using competitor X', 'Locked in for 12 months'],
        quotes: ['We just signed with a competitor'],
        objections: ['Locked into competitor contract'],
        validationSignals: [],
        commitments: [],
        nextSteps: ['Re-engage in Q4'],
        sentiment: 'negative',
        sentimentScore: -0.3,
      },
    },
  });
  assert('Created 3 calls', !!(call1 && call2 && call3));

  // Touchpoints
  await prisma.touchpoint.createMany({
    data: [
      {
        leadId: lead1.id,
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        type: 'INITIAL',
        subject: 'Hi from LeadFlow',
        body: 'Wanted to introduce myself...',
        sentAt: new Date('2026-02-20T09:00:00Z'),
        gotReply: true,
      },
      {
        leadId: lead2.id,
        channel: 'LINKEDIN',
        direction: 'OUTBOUND',
        type: 'INITIAL',
        subject: 'Connection request',
        sentAt: new Date('2026-02-21T09:00:00Z'),
        gotReply: false,
      },
    ],
  });

  // Stage history for lead1
  await prisma.leadStageHistory.create({
    data: { leadId: lead1.id, stage: 'RESEARCHED', enteredAt: new Date('2026-02-15T00:00:00Z') },
  });
  await prisma.leadStageHistory.create({
    data: { leadId: lead1.id, stage: 'MEETING_BOOKED', enteredAt: new Date('2026-03-01T00:00:00Z') },
  });

  // Raw sources, one tagged to Acme
  await prisma.wikiRawSource.createMany({
    data: [
      {
        projectId: project.id,
        kind: 'NOTE',
        title: 'Acme market research',
        content: 'Acme operates in the B2B SaaS space with 200+ employees.',
        metadata: { companyName: 'Acme Corp', tags: ['research'] } as any,
      },
      {
        projectId: project.id,
        kind: 'NOTE',
        title: 'General industry trend',
        content: 'Sector-wide pricing compression of 10%.',
        metadata: { tags: ['industry'] } as any,
      },
    ],
  });
  assert('Created fixture data (touchpoints, stage history, raw sources)', true);

  // ========== TEST GROUP 1: context.ts ==========
  section('1. Context Builders');

  // buildCompanyContext
  {
    const ctx = await buildCompanyContext(project.id, 'Acme Corp');
    assert('buildCompanyContext returns project', ctx.project.id === project.id);
    assert('buildCompanyContext returns 2 leads for Acme', ctx.leads.length === 2, `got ${ctx.leads.length}`);
    assert('buildCompanyContext returns 2 calls for Acme', ctx.calls.length === 2, `got ${ctx.calls.length}`);
    assert('buildCompanyContext returns 1 touchpoint for Acme', ctx.touchpoints.length === 1, `got ${ctx.touchpoints.length}`);
    assert('buildCompanyContext returns only tagged raw sources', ctx.rawSources.length === 1, `got ${ctx.rawSources.length}`);
    assert('Company leads sorted by priority desc', ctx.leads[0].priorityScore >= ctx.leads[1].priorityScore);
    assert('Company calls include lead info', !!ctx.calls[0].lead?.firstName);
  }

  // Unknown company returns empty context
  {
    const ctx = await buildCompanyContext(project.id, 'Nonexistent Co');
    assert('Unknown company → empty leads', ctx.leads.length === 0);
    assert('Unknown company → empty calls', ctx.calls.length === 0);
  }

  // buildLeadContext
  {
    const ctx = await buildLeadContext(project.id, lead1.id);
    assert('buildLeadContext returns the lead', ctx.lead.id === lead1.id);
    assert('buildLeadContext returns 2 calls for lead1', ctx.calls.length === 2);
    assert('buildLeadContext returns 1 touchpoint for lead1', ctx.touchpoints.length === 1);
    assert('buildLeadContext returns 2 stage history entries', ctx.stageHistory.length === 2);
    assert('Stage history sorted by enteredAt asc', ctx.stageHistory[0].stage === 'RESEARCHED');
  }

  // buildLeadContext cross-project rejection
  {
    const otherProject = await prisma.project.create({ data: { name: 'Other' } });
    try {
      await buildLeadContext(otherProject.id, lead1.id);
      assert('Cross-project buildLeadContext should throw', false);
    } catch (e: any) {
      assert('Cross-project buildLeadContext throws', e.message.includes('does not belong'));
    }
    await prisma.project.delete({ where: { id: otherProject.id } });
  }

  // buildCallContext
  {
    const ctx = await buildCallContext(project.id, call2.id);
    assert('buildCallContext returns call', ctx.call.id === call2.id);
    assert('buildCallContext returns lead', ctx.lead.id === lead1.id);
    assert('buildCallContext returns 1 prior call', ctx.priorCalls.length === 1, `got ${ctx.priorCalls.length}`);
    assert('Prior call is call1', ctx.priorCalls[0].id === call1.id);
  }

  // Earliest call has no priors
  {
    const ctx = await buildCallContext(project.id, call1.id);
    assert('First call has 0 prior calls', ctx.priorCalls.length === 0);
  }

  // buildProjectContext
  {
    const ctx = await buildProjectContext(project.id);
    assert('buildProjectContext leadCount = 3', ctx.leadCount === 3);
    assert('buildProjectContext callCount = 3', ctx.callCount === 3);
    assert('buildProjectContext 2 companies', ctx.companies.length === 2);
    assert(
      'buildProjectContext companies sorted by leadCount desc',
      ctx.companies[0].leadCount >= ctx.companies[1].leadCount,
    );
    assert('Acme has 2 leads', ctx.companies.find((c) => c.name === 'Acme Corp')?.leadCount === 2);
    assert('Acme has 2 calls', ctx.companies.find((c) => c.name === 'Acme Corp')?.callCount === 2);
    assert('2 raw sources visible', ctx.rawSources.length === 2);
  }

  // buildTopicContext - objections
  {
    const ctx = await buildTopicContext(project.id, 'objections');
    assert('Topic objections has matches', ctx.matches.length >= 1, `got ${ctx.matches.length}`);
    const hasPriceObjection = ctx.matches.some((m) =>
      m.matchedNotes.some((n) => n.toLowerCase().includes('price') || n.toLowerCase().includes('budget')),
    );
    assert('Topic objections finds price objection', hasPriceObjection);
  }

  // buildTopicContext - competitors
  {
    const ctx = await buildTopicContext(project.id, 'competitors');
    assert('Topic competitors has matches', ctx.matches.length >= 1, `got ${ctx.matches.length}`);
  }

  // Topic with no matches
  {
    const ctx = await buildTopicContext(project.id, 'pricing-feedback');
    assert('Topic pricing-feedback has matches', ctx.matches.length >= 1);
  }

  // Non-existent project
  {
    try {
      await buildProjectContext('nonexistent-id');
      assert('Non-existent project should throw', false);
    } catch (e: any) {
      assert('Non-existent project throws', e.message.includes('not found'));
    }
  }

  // ========== TEST GROUP 2: prompts.ts ==========
  section('2. Prompt Templates');

  const companyCtx = await buildCompanyContext(project.id, 'Acme Corp');
  const leadCtx = await buildLeadContext(project.id, lead1.id);
  const callCtx = await buildCallContext(project.id, call2.id);
  const projectCtx = await buildProjectContext(project.id);
  const topicCtx = await buildTopicContext(project.id, 'objections');

  // companyPrompt
  {
    const p = companyPrompt(companyCtx);
    assert('companyPrompt has system text', p.system.length > 0);
    assert('companyPrompt mentions company name', p.user.includes('Acme Corp'));
    assert('companyPrompt mentions leads', p.user.includes('Alice') && p.user.includes('Bob'));
    assert('companyPrompt includes call log', p.user.includes('Intro with Alice'));
    assert('companyPrompt includes raw source', p.user.includes('Acme market research'));
    assert('companyPrompt has markdown rules', p.system.includes('markdown'));
    assert('companyPrompt instructs [[...]]' , p.system.includes('[[wiki-path'));
    // Verify backlinks are valid paths
    assert(
      'companyPrompt contains person backlinks',
      p.user.includes(personPath('Acme Corp', lead1.id, 'Alice Anderson')) ||
        p.user.includes(personPath('Acme Corp', lead2.id, 'Bob Brown')),
    );
  }

  // personPrompt
  {
    const p = personPrompt(leadCtx);
    assert('personPrompt mentions full name', p.user.includes('Alice Anderson'));
    assert('personPrompt mentions title', p.user.includes('VP Engineering'));
    assert('personPrompt mentions stage history', p.user.includes('MEETING_BOOKED'));
    assert('personPrompt backlinks to company', p.user.includes(companyIndexPath('Acme Corp')));
    assert('personPrompt lists calls', p.user.includes('Intro with Alice'));
  }

  // callPrompt
  {
    const p = callPrompt(callCtx);
    assert('callPrompt mentions call title', p.user.includes('ROI followup with Alice'));
    assert('callPrompt backlinks to company', p.user.includes(companyIndexPath('Acme Corp')));
    assert('callPrompt backlinks to person', p.user.includes(personPath('Acme Corp', lead1.id, 'Alice Anderson')));
    assert('callPrompt lists prior calls', p.user.includes('Intro with Alice'));
    assert('callPrompt includes structured notes', p.user.includes('Summary: ROI analysis'));
  }

  // projectIndexPrompt
  {
    const p = projectIndexPrompt(projectCtx);
    assert('projectIndexPrompt mentions project name', p.user.includes('Stress Test Project'));
    assert('projectIndexPrompt lists companies', p.user.includes('Acme Corp') && p.user.includes('Globex Inc'));
    assert('projectIndexPrompt mentions lead count', p.user.includes('Total leads: 3'));
    assert('projectIndexPrompt mentions call count', p.user.includes('Total calls: 3'));
    assert('projectIndexPrompt references fixed topics', p.user.includes('objections'));
  }

  // topicPrompt
  {
    const p = topicPrompt(topicCtx);
    assert('topicPrompt mentions topic key', p.user.includes('objections'));
    assert('topicPrompt has matching excerpts', p.user.includes('Matching excerpts'));
    assert(
      'topicPrompt includes call backlinks',
      p.user.includes(callPath('Acme Corp', call1.id, call1.callDate, call1.title)),
    );
  }

  // topicDiscoveryPrompt
  {
    const p = topicDiscoveryPrompt([
      { path: 'companies/acme/index.md', title: 'Acme Corp' },
      { path: '_objections.md', title: 'Objections' },
    ]);
    assert('topicDiscoveryPrompt requires JSON output', p.system.includes('JSON'));
    assert('topicDiscoveryPrompt lists existing pages', p.user.includes('Acme Corp'));
    assert('topicDiscoveryPrompt mentions kebab-case', p.user.includes('kebab-case'));
  }

  // ========== TEST GROUP 3: compile.ts ==========
  section('3. Compile Orchestrator');

  // Stub generator that records calls
  type Call = { method: string; args: unknown[] };
  const createStubRegistry = (): { registry: GeneratorRegistry; calls: Call[] } => {
    const calls: Call[] = [];
    const fakeResult = (path: string): WriteDocResult => ({
      doc: {
        id: 'fake-' + Math.random().toString(36).slice(2),
        projectId: project.id,
        path,
        kind: 'COMPANY',
        version: 1,
        frontmatter: {} as any,
        content: '',
        contentHash: 'hash',
        sources: [] as any,
        supersededById: null,
        generatedAt: new Date(),
        createdAt: new Date(),
      },
      created: true,
      versionBumped: false,
    });
    const registry: GeneratorRegistry = {
      async generateCompany(_p, name) {
        calls.push({ method: 'company', args: [name] });
        return fakeResult(companyIndexPath(name));
      },
      async generatePerson(_p, leadId) {
        calls.push({ method: 'person', args: [leadId] });
        const l = await prisma.lead.findUnique({ where: { id: leadId } });
        return fakeResult(personPath(l!.company, l!.id, `${l!.firstName} ${l!.lastName}`));
      },
      async generateCall(_p, callId) {
        calls.push({ method: 'call', args: [callId] });
        const c = await prisma.call.findUnique({ where: { id: callId }, include: { lead: true } });
        return fakeResult(callPath(c!.lead.company, c!.id, c!.callDate, c!.title));
      },
      async generateProjectIndex(_p) {
        calls.push({ method: 'projectIndex', args: [] });
        return fakeResult(projectIndexPath());
      },
      async generateTopic(_p, topicKey) {
        calls.push({ method: 'topic', args: [topicKey] });
        return fakeResult(topicPath(topicKey));
      },
    };
    return { registry, calls };
  };

  // Scope: call — the main incremental path
  {
    const { registry, calls } = createStubRegistry();
    const result = await compileProject(project.id, { kind: 'call', callId: call1.id }, registry);
    const methods = calls.map((c) => c.method);
    assert('call scope calls generateCall', methods.includes('call'));
    assert('call scope calls generatePerson', methods.includes('person'));
    assert('call scope calls generateCompany', methods.includes('company'));
    assert('call scope calls generateProjectIndex', methods.includes('projectIndex'));
    // call1 has price/budget/competitor/icp keywords → topics should fire
    assert('call scope fires topics based on keywords', methods.includes('topic'));
    assert('No errors in compile result', result.errors.length === 0, JSON.stringify(result.errors));
    assert('All tasks marked as written (no priors)', result.written.length >= 4);
  }

  // Scope: lead
  {
    const { registry, calls } = createStubRegistry();
    const result = await compileProject(project.id, { kind: 'lead', leadId: lead1.id }, registry);
    const methods = calls.map((c) => c.method);
    assert('lead scope calls generatePerson', methods.includes('person'));
    assert('lead scope calls generateCompany', methods.includes('company'));
    assert('lead scope calls generateProjectIndex', methods.includes('projectIndex'));
    assert('lead scope does NOT call generateCall', !methods.includes('call'));
    assert('lead scope no errors', result.errors.length === 0);
  }

  // Scope: company
  {
    const { registry, calls } = createStubRegistry();
    const result = await compileProject(project.id, { kind: 'company', companyName: 'Acme Corp' }, registry);
    const methods = calls.map((c) => c.method);
    const personCalls = calls.filter((c) => c.method === 'person');
    const callCalls = calls.filter((c) => c.method === 'call');
    assert('company scope generates person for each lead', personCalls.length === 2);
    assert('company scope generates call for each call', callCalls.length === 2);
    assert('company scope generates the company index', methods.includes('company'));
    assert('company scope generates project index', methods.includes('projectIndex'));
    assert('company scope no errors', result.errors.length === 0);
  }

  // Scope: topic
  {
    const { registry, calls } = createStubRegistry();
    const result = await compileProject(project.id, { kind: 'topic', topicKey: 'objections' }, registry);
    assert('topic scope calls only generateTopic', calls.length === 1 && calls[0].method === 'topic');
    assert('topic scope no errors', result.errors.length === 0);
  }

  // Scope: all
  {
    const { registry, calls } = createStubRegistry();
    const result = await compileProject(project.id, { kind: 'all' }, registry);
    const methods = calls.map((c) => c.method);
    const personCalls = calls.filter((c) => c.method === 'person');
    const callCalls = calls.filter((c) => c.method === 'call');
    const companyCalls = calls.filter((c) => c.method === 'company');
    const topicCalls = calls.filter((c) => c.method === 'topic');
    assert('all scope generates every lead (3)', personCalls.length === 3);
    assert('all scope generates every call (3)', callCalls.length === 3);
    assert('all scope generates every company (2)', companyCalls.length === 2);
    assert('all scope fires 4 fixed topics', topicCalls.length === 4);
    assert('all scope generates project index', methods.includes('projectIndex'));
    assert('all scope no errors', result.errors.length === 0);
  }

  // Error resilience — a generator that throws
  {
    const throwing: GeneratorRegistry = {
      async generateCompany() { throw new Error('boom company'); },
      async generatePerson() { throw new Error('boom person'); },
      async generateCall() { throw new Error('boom call'); },
      async generateProjectIndex() { throw new Error('boom index'); },
      async generateTopic() { throw new Error('boom topic'); },
    };
    const result = await compileProject(project.id, { kind: 'call', callId: call1.id }, throwing);
    assert('Throwing generators produce errors (not crash)', result.errors.length > 0);
    assert('Each error has path + message', result.errors.every((e) => !!e.path && !!e.error));
    assert('Error path for company', result.errors.some((e) => e.error.includes('boom')));
  }

  // Dedup — same path only runs once
  {
    let companyCount = 0;
    const counting: GeneratorRegistry = {
      async generateCompany(_p, name) {
        companyCount++;
        return {
          doc: { id: 'x', projectId: project.id, path: companyIndexPath(name), kind: 'COMPANY', version: 1, frontmatter: {} as any, content: '', contentHash: 'h', sources: [] as any, supersededById: null, generatedAt: new Date(), createdAt: new Date() },
          created: true,
          versionBumped: false,
        };
      },
      async generatePerson() { return null as any; },
      async generateCall() { return null as any; },
      async generateProjectIndex() { return null as any; },
      async generateTopic() { return null as any; },
    };
    // Use company scope — will generate company once + projectIndex once
    // Then also person/call tasks which return null (that's fine for dedup test)
    // Just verify company was called exactly once despite being in task list
    await compileProject(project.id, { kind: 'company', companyName: 'Acme Corp' }, counting).catch(() => {});
    assert('Company generator called exactly once for company scope', companyCount === 1);
  }

  // Scope error — nonexistent call
  {
    const { registry } = createStubRegistry();
    try {
      await compileProject(project.id, { kind: 'call', callId: 'nonexistent' }, registry);
      assert('Nonexistent call scope should throw', false);
    } catch (e: any) {
      assert('Nonexistent call throws before dispatch', e.message.includes('not found'));
    }
  }

  // ========== CLEANUP ==========
  section('Cleanup');
  await prisma.project.delete({ where: { id: project.id } });
  assert('Cleanup: fixture project deleted', true);

  // ========== SUMMARY ==========
  console.log('\n\x1b[1m============================\x1b[0m');
  console.log(`\x1b[32mPASSED: ${passed}/${passed + failed}\x1b[0m`);
  if (failed > 0) {
    console.log(`\x1b[31mFAILED: ${failed}\x1b[0m`);
    console.log('\nFailures:');
    errors.forEach((e) => console.log('  - ' + e));
  }
  console.log('\x1b[1m============================\x1b[0m');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('FATAL:', e);
  await prisma.$disconnect();
  process.exit(1);
});
