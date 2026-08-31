import assert from 'node:assert/strict';
import {
  buildLeadershipSummary,
  getRelationshipSignals,
  parseDirectoryQuestion,
  suggestFromInteractionNotes,
} from './src/data/agentic.js';

const today = '2026-08-29';

const suggestion = suggestFromInteractionNotes(
  'Talked to Sarah. Interested in mentoring. Call back next week.',
  today,
);
assert.equal(suggestion.suggestedStage, 'potential');
assert.deepEqual(suggestion.ministryTags, ['Mentoring']);
assert.equal(suggestion.followUp.dueDate, '2026-09-05');

assert.deepEqual(parseDirectoryQuestion('Partnering churches without an advocate'), {
  status: 'partnering',
  missingAdvocate: true,
  stale: false,
});

const data = {
  churches: [
    { id: 'ch_1', name: 'Grace Church', engagementStatus: 'partnering', lastInteractionDate: '2026-04-01' },
    { id: 'ch_2', name: 'Hope Church', engagementStatus: 'potential', lastInteractionDate: null },
  ],
  interactions: [{ id: 'int_1', churchId: 'ch_1', date: '2026-08-28' }],
  tasks: [
    { id: 'task_1', churchId: 'ch_1', title: 'Call pastor', dueDate: '2026-08-20', status: 'open' },
    { id: 'task_2', churchId: 'ch_2', title: 'Send packet', dueDate: '2026-08-28', status: 'completed' },
  ],
};

const signals = getRelationshipSignals(data, today);
assert.ok(signals.some(item => item.id === 'task-task_1' && item.reason.includes('2026-08-20')));
assert.ok(signals.some(item => item.id === 'stale-ch_1'));
assert.ok(signals.some(item => item.id === 'never-ch_2'));

const summary = buildLeadershipSummary(data, today);
assert.equal(summary.churchesContacted, 1);
assert.equal(summary.interactions, 1);
assert.equal(summary.completedFollowUps, 1);
assert.equal(summary.partneringChurches, 1);

console.log('Agentic workflow tests passed');
