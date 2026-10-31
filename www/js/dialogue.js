// LUMIERE v5 - conversation trees. Text lives in the language files (i18n); a node is [textKey, [[optionKey, target], ...]].
// target: another node id, 'end', or 'act:<name>[:arg]' handled by main.js (reserve, guide, buy, tablet, ownTablet, ownOpen).
// v8: every text key is a list of lines (a different one each time, each with its recorded voice).
export const TREES = {
  reception: { start: 'greet', nodes: {
    greet: ['rec.greet', [['opt.book', 'act:reserve'], ['opt.films', 'films'], ['opt.own', 'own'], ['opt.where', 'where'], ['opt.bye', 'end']]],
    again: ['rec.again', [['opt.book', 'act:reserve'], ['opt.own', 'own'], ['opt.where', 'where'], ['opt.bye', 'end']]],
    films: ['rec.films', [['opt.book', 'act:reserve'], ['opt.back', 'greet'], ['opt.bye', 'end']]],
    own: ['rec.own', [['opt.ownTablet', 'act:ownTablet'], ['opt.book', 'act:reserve'], ['opt.back', 'greet']]],
    where: ['rec.where', [['opt.thanks', 'greet'], ['opt.bye', 'end']]] } },
  usher: { start: 'greet', nodes: {
    greet: ['ush.greet', [['opt.showTicket', 'act:guide'], ['opt.tips', 'tips'], ['opt.best', 'best'], ['opt.bye', 'end']]],
    noTicket: ['ush.noTicket', [['opt.tips', 'tips'], ['opt.best', 'best'], ['opt.thanks', 'end']]],
    tips: ['ush.tips', [['opt.back', 'greet'], ['opt.bye', 'end']]],
    best: ['ush.best', [['opt.back', 'greet'], ['opt.bye', 'end']]] } },
  vendor: { start: 'greet', nodes: {
    greet: ['ven.greet', [['opt.salted', 'act:buy:salted'], ['opt.caramel', 'act:buy:caramel'], ['opt.cola', 'act:buy:cola'], ['opt.combo', 'act:buy:combo'], ['opt.look', 'end']]] } },
  bar: { start: 'greet', nodes: {
    greet: ['bar.greet', [['opt.coffee', 'act:buy:coffee'], ['opt.mocktail', 'act:buy:mocktail'], ['opt.soda', 'act:buy:cola'], ['opt.gossip', 'gossip'], ['opt.bye', 'end']]],
    gossip: ['bar.gossip', [['opt.back', 'greet'], ['opt.bye', 'end']]] } },
  // v8: the server who answers your seat bell
  server: { start: 'greet', nodes: {
    greet: ['srv.greet', [['opt.order', 'order'], ['opt.aboutFilm', 'act:tablet'], ['opt.nothing', 'end']]],
    order: ['srv.menu', [['opt.salted', 'act:buy:salted'], ['opt.caramel', 'act:buy:caramel'], ['opt.cola', 'act:buy:cola'], ['opt.coffee', 'act:buy:coffee'], ['opt.back', 'greet']]] } },
  // v8: the host at the door
  greeter: { start: 'greet', nodes: {
    greet: ['gre.greet', [['opt.tickets', 'tickets'], ['opt.tonight', 'tonight'], ['opt.where', 'where'], ['opt.bye', 'end']]],
    tickets: ['gre.tickets', [['opt.back', 'greet'], ['opt.thanks', 'end']]],
    tonight: ['gre.tonight', [['opt.back', 'greet'], ['opt.thanks', 'end']]],
    where: ['gre.where', [['opt.back', 'greet'], ['opt.thanks', 'end']]] } },
  guest: { start: 'greet', nodes: { greet: ['guest.small', [['opt.more', 'more'], ['opt.bye', 'end']]], more: ['guest.more', [['opt.bye', 'end']]] } },
};
export function treeFor(agent, ctx = {}) {
  const r = TREES[agent.role] && agent.role !== 'guest' ? agent.role : 'guest', tree = TREES[r];
  return { ...tree, start: r === 'usher' && !ctx.ticket ? 'noTicket' : r === 'reception' && ctx.ticket ? 'again' : tree.start };
}
