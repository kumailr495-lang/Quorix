// LUMIERE v9 - conversation trees (lines: tools/dev/i18n/v9-dialogue.json, every line recorded per voice). A node is
// [lineKey, [[optionKey, target], ...]]; target: a node, 'end', or 'act:<name>[:arg]' (main9.js). Options are short and say what happens.
// v14 the menu (menu.js) by category: each option is the item's name and buys it; 'back' returns to the node that listed the categories
const buy = (ids, back) => ids.map((id) => ['food.' + id, 'act:buy:' + id]).concat([['opt.back', back]]);
const FOOD = (line, back) => ({ hot: [line, buy(['nachos', 'hotdog', 'burger', 'pizza', 'fries'], back)], sweet: [line, buy(['icecream', 'churros', 'choc', 'gummies'], back)],
  cold: [line, buy(['cola', 'lemonade', 'icedtea', 'shake', 'slush', 'water'], back)], combo: [line, buy(['combo', 'date', 'sweettooth'], back)] });
export const TREES = {
  host: { start: 'hello', nodes: {
    hello: ['host.hello', [['opt9.tickets', 'tickets'], ['opt9.food', 'food'], ['opt9.wc', 'wc'], ['opt9.gate', 'gate'], ['opt.suite', 'act:suite'], ['opt.bye', 'end']]],   // v14d the Suite: the host takes you up
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
    hello: ['bar.hello', [['cat.popcorn', 'what'], ['cat.hot', 'hot'], ['cat.sweets', 'sweet'], ['cat.cold', 'cold'], ['cat.combos', 'combo'], ['opt.bye', 'end']]],
    ...FOOD('bar.pick', 'hello'), what: ['bar.what', buy(['salted', 'caramel', 'cheese', 'truffle'], 'hello')] } },
  // v10 the cafe's barista (npc9.js 'cafe'): the coffees on the menu board, each one a cup in your hand
  cafe: { start: 'hello', nodes: {
    hello: ['cafe.hello', [['food.espresso', 'act:buy:espresso'], ['food.cappuccino', 'act:buy:cappuccino'], ['food.latte', 'act:buy:latte'], ['food.hotchoc', 'act:buy:hotchoc'], ['food.chai', 'act:buy:chai'], ['cat.sweets', 'sweet'], ['opt.bye', 'end']]],
    sweet: ['bar.pick', buy(['churros', 'choc', 'icecream'], 'hello')] } },
  usher: { start: 'ask', nodes: {
    ask: ['ush.ask', [['opt9.showTicket', 'act:ticket'], ['opt.bye', 'end']]],
    noTicket: ['ush.noTicket', [['opt.thanks', 'end']]],
    locate: ['ush.locate', [['opt9.walkMe', 'act:escort'], ['opt9.ownWay', 'act:ownWay']]] } },
  server: { start: 'arrive', nodes: {
    arrive: ['srv.arrive', [['opt9.order', 'menu'], ['opt9.tablet', 'act:tablet'], ['opt9.takeTrash', 'act:trash'], ['opt9.nothing', 'act:serverBye']]],
    menu: ['srv.menu', [['cat.popcorn', 'what'], ['cat.hot', 'hot'], ['cat.sweets', 'sweet'], ['cat.cold', 'cold'], ['cat.hotdrinks', 'warm'], ['opt.back', 'arrive']]],
    ...FOOD('bar.pick', 'menu'), what: ['bar.pick', buy(['salted', 'caramel', 'cheese', 'truffle'], 'menu')], warm: ['bar.pick', buy(['espresso', 'cappuccino', 'latte', 'hotchoc', 'chai'], 'menu')],
    back: ['srv.back', [['opt9.order', 'menu'], ['opt9.nothing', 'act:serverBye']]] } },
  // a stranger answers as their temper has it (npc9.js Agent.temper). v14 (the user, 11-20: "almost all of them are rude, they were better
  // before"): most are warm, a third plain, one in ten busy; a busy one ends the talk themselves (main.js startTalk)
  guest: { start: 'hi', nodes: { hi: ['guest.talk.plain', [['opt.bye', 'end']]], warm: ['guest.talk.warm', [['opt.bye', 'end']]], curt: ['guest.talk.curt', [['opt.bye', 'end']]] } },
};
export function treeFor(agent, ctx = {}) {
  const role = TREES[agent.role] ? agent.role : 'guest', tree = TREES[role];
  let start = tree.start;
  if (role === 'host' && ctx.visits > 1) start = 'back';
  if (role === 'box' && ctx.ticket) start = 'again';
  if (role === 'usher') start = !ctx.ticket ? 'noTicket' : ctx.ticket.checked ? 'locate' : 'ask';
  if (role === 'server' && ctx.serverBack) start = 'back';
  if (role === 'guest') start = agent.temper === 'warm' ? 'warm' : agent.temper === 'curt' ? 'curt' : 'hi';
  return { ...tree, start };
}
