// LUMIERE v9 - conversation trees (lines: tools/dev/i18n/v9-dialogue.json, every line recorded per voice). A node is
// [lineKey, [[optionKey, target], ...]]; target: a node, 'end', or 'act:<name>[:arg]' (main9.js). Options are short and say what happens.
export const TREES = {
  host: { start: 'hello', nodes: {
    hello: ['host.hello', [['opt9.tickets', 'tickets'], ['opt9.food', 'food'], ['opt9.wc', 'wc'], ['opt9.gate', 'gate'], ['opt.bye', 'end']]],
    back: ['host.back', [['opt9.tickets', 'tickets'], ['opt9.food', 'food'], ['opt9.wc', 'wc'], ['opt.bye', 'end']]],
    tickets: ['host.tickets', [['opt.thanks', 'end'], ['opt.back', 'hello']]], food: ['host.food', [['opt.thanks', 'end'], ['opt.back', 'hello']]],
    wc: ['host.wc', [['opt.thanks', 'end'], ['opt.back', 'hello']]], gate: ['host.gate', [['opt.thanks', 'end'], ['opt.back', 'hello']]] } },
  box: { start: 'hello', nodes: {
    hello: ['box.hello', [['opt9.buy', 'act:book'], ['opt9.formats', 'formats'], ['opt9.ownVideo', 'act:bookOwn'], ['opt.bye', 'end']]],
    again: ['box.again', [['opt9.buy', 'act:book'], ['opt9.formats', 'formats'], ['opt.bye', 'end']]],
    formats: ['box.pick', [['opt9.fmtMAX', 'fMAX'], ['opt9.fmtCURVE', 'fCURVE'], ['opt9.fmtCLASSIC', 'fCLASSIC'], ['opt9.fmtX270', 'fX270'], ['opt9.buy', 'act:book']]],
    fMAX: ['box.fmt.MAX', [['opt9.buy', 'act:book'], ['opt.back', 'formats']]], fCURVE: ['box.fmt.CURVE', [['opt9.buy', 'act:book'], ['opt.back', 'formats']]],
    fCLASSIC: ['box.fmt.CLASSIC', [['opt9.buy', 'act:book'], ['opt.back', 'formats']]], fX270: ['box.fmt.X270', [['opt9.buy', 'act:book'], ['opt.back', 'formats']]] } },
  bar: { start: 'hello', nodes: {
    hello: ['bar.hello', [['opt9.popcorn', 'what'], ['opt9.combo', 'act:buy:combo'], ['opt9.drink', 'act:buy:cola'], ['opt9.coffee', 'act:buy:coffee'], ['opt.bye', 'end']]],
    what: ['bar.what', [['opt9.salted', 'act:buy:salted'], ['opt9.caramel', 'act:buy:caramel'], ['opt9.cheese', 'act:buy:cheese'], ['opt.back', 'hello']]] } },
  usher: { start: 'ask', nodes: {
    ask: ['ush.ask', [['opt9.showTicket', 'act:ticket'], ['opt.bye', 'end']]],
    noTicket: ['ush.noTicket', [['opt.thanks', 'end']]],
    locate: ['ush.locate', [['opt9.walkMe', 'act:escort'], ['opt9.ownWay', 'act:ownWay']]] } },
  server: { start: 'arrive', nodes: {
    arrive: ['srv.arrive', [['opt9.order', 'menu'], ['opt9.tablet', 'act:tablet'], ['opt9.takeTrash', 'act:trash'], ['opt9.nothing', 'act:serverBye']]],
    menu: ['srv.menu', [['opt9.salted', 'act:buy:salted'], ['opt9.caramel', 'act:buy:caramel'], ['opt9.drink', 'act:buy:cola'], ['opt9.coffee', 'act:buy:coffee'], ['opt9.nachos', 'act:buy:nachos'], ['opt.back', 'arrive']]],
    back: ['srv.back', [['opt9.order', 'menu'], ['opt9.nothing', 'act:serverBye']]] } },
  guest: { start: 'hi', nodes: { hi: ['guest.small', [['opt.bye', 'end']]] } },
};
export function treeFor(agent, ctx = {}) {
  const role = TREES[agent.role] ? agent.role : 'guest', tree = TREES[role];
  let start = tree.start;
  if (role === 'host' && ctx.visits > 1) start = 'back';
  if (role === 'box' && ctx.ticket) start = 'again';
  if (role === 'usher') start = !ctx.ticket ? 'noTicket' : ctx.ticket.checked ? 'locate' : 'ask';
  if (role === 'server' && ctx.serverBack) start = 'back';
  return { ...tree, start };
}
