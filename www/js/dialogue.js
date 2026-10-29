// LUMIERE v5 - conversation trees. Text lives in the language files (i18n); a node is [textKey, [[optionKey, target], ...]].
// target: another node id, 'end', or 'act:<name>[:arg]' handled by main.js (reserve, guide, buy).
export const TREES = {
  reception: { start: 'greet', nodes: {
    greet: ['rec.greet', [['opt.book', 'act:reserve'], ['opt.films', 'films'], ['opt.own', 'own'], ['opt.where', 'where'], ['opt.bye', 'end']]],
    films: ['rec.films', [['opt.book', 'act:reserve'], ['opt.back', 'greet'], ['opt.bye', 'end']]],
    own: ['rec.own', [['opt.book', 'act:reserve'], ['opt.back', 'greet']]],
    where: ['rec.where', [['opt.thanks', 'greet'], ['opt.bye', 'end']]] } },
  usher: { start: 'greet', nodes: {
    greet: ['ush.greet', [['opt.guide', 'act:guide'], ['opt.tips', 'tips'], ['opt.best', 'best'], ['opt.bye', 'end']]],
    noTicket: ['ush.noTicket', [['opt.tips', 'tips'], ['opt.best', 'best'], ['opt.thanks', 'end']]],
    tips: ['ush.tips', [['opt.back', 'greet'], ['opt.bye', 'end']]],
    best: ['ush.best', [['opt.back', 'greet'], ['opt.bye', 'end']]] } },
  vendor: { start: 'greet', nodes: {
    greet: ['ven.greet', [['opt.salted', 'act:buy:salted'], ['opt.caramel', 'act:buy:caramel'], ['opt.cola', 'act:buy:cola'], ['opt.combo', 'act:buy:combo'], ['opt.look', 'end']]] } },
  bar: { start: 'greet', nodes: {
    greet: ['bar.greet', [['opt.coffee', 'act:buy:coffee'], ['opt.mocktail', 'act:buy:mocktail'], ['opt.soda', 'act:buy:cola'], ['opt.gossip', 'gossip'], ['opt.bye', 'end']]],
    gossip: ['bar.gossip', [['opt.back', 'greet'], ['opt.bye', 'end']]] } },
  guest: { start: 'greet', nodes: { greet: ['guest.small', [['opt.more', 'more'], ['opt.bye', 'end']]], more: ['guest.more', [['opt.bye', 'end']]] } },
};
export function treeFor(agent, ctx = {}) {
  const r = agent.role === 'reception' ? 'reception' : agent.role === 'usher' ? 'usher' : agent.role === 'vendor' ? 'vendor' : agent.role === 'bar' ? 'bar' : 'guest';
  const tree = TREES[r]; return { ...tree, start: r === 'usher' && !ctx.ticket ? 'noTicket' : tree.start };
}
