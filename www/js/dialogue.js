// Dialogue trees, ambient barks and conversation scripts (art-deco cinema voice). Pure data + tiny helpers.
export const GREET = ['Good evening!', 'Welcome to the Lumière.', 'Mind the carpet — it is older than it looks.', 'Splendid night for a picture.', 'Do take your time, the projector never does.', 'Evening! Lovely to see a new face.'];
export const REACT = { laugh: ['Ha!', 'Oh, wonderful!', 'Ha ha — marvellous!'], gasp: ['Oh!', 'Did you see that?', 'Goodness!'], shh: ['Shh!', 'Quiet, please…'], cheer: ['Bravo!', 'Encore!', 'Magnificent!', 'Hurrah!'] };
export const CHATS = [
  ['Did you catch the new print of Velvet Hour?', 'Grain like fresh snow. I wept.', 'You weep at the trailers.', 'Only the good ones.'],
  ['Is it true the projector is haunted?', 'Marcel says it sulks if rushed.', 'So do I.', 'We know, darling.'],
  ['Row D is the best seat in the house.', 'Row D is the most expensive seat in the house.', 'Same thing, in this building.', 'Quite.'],
  ['That chandelier came all the way from Prague.', 'In pieces, I am told.', 'And reassembled by a madman.', 'A talented madman.'],
  ['Popcorn before or after the trailers?', 'During, naturally.', 'Barbarian.', 'Happy barbarian.'],
  ['They say the velvet seats were restored by hand.', 'Eight hundred hours, I heard.', 'And someone still spilled lemonade on D9.', 'Someone always does.'],
  ['Which screen tonight?', 'The curved one. I want to feel enveloped.', 'I want to feel nothing, and to hear a cello.', 'Then Screen Three. They have the cellos.'],
];
export const IDLE = { reception: ['Shall I find you a seat?', 'The first show begins at half past seven.', 'Our tapes are rewound by hand, you know.'], usher: ['Mind the steps, please.', 'Tickets ready, ladies and gentlemen.', 'Row D is straight ahead, then left.'],
  barkeep: ['A little something before the picture?', 'Velvet fizz, freshly poured.', 'Ice is the only thing we never run out of.'], vendor: ['Popcorn! Salted or caramel!', 'Fresh from the kettle!', 'Lemonade, ice-cold!'], patron: ['Lovely lobby, isn’t it?', 'Is it half past yet?', 'I do adore a velvet seat.', 'Where did I leave my ticket…'],
  audience: ['Is it starting?', 'I hope they kept the overture.', 'These seats are heavenly.', 'Shh — the lights are going down soon.', 'Pass the popcorn?', 'I heard the ending is a surprise.', 'Best seats in the house, these.'] };
const T = (text, opts) => ({ text, opts });
export const TREES = {
  reception: { start: 'greet', nodes: {
    greet: T('Good evening, and welcome to the Lumière. Three screens tonight, and a projector that will happily thread your own film. How may I help?', [['I would like to reserve a seat', 'act:reserve'], ['What is showing tonight?', 'films'], ['How does “my own film” work?', 'own'], ['Where is everything?', 'where'], ['Goodbye', 'end']]),
    films: T('The Long Night in Screen One, the Grand Hall. Velvet Hour in Screen Two, with the curved screen. A Quiet Room in Screen Three, the big arc. All fresh prints — a little grain, as nature intended.', [['Reserve a seat', 'act:reserve'], ['Anything else?', 'greet'], ['Goodbye', 'end']]),
    own: T('Pick a video from your phone — or paste a link — and we thread it in the booth. It plays on the screen named on your ticket, with sound. The projectionist grumbles, but he always obliges.', [['Reserve a seat', 'act:reserve'], ['Back', 'greet'], ['Goodbye', 'end']]),
    where: T('The bar is on your right as you enter, refreshments on the left. Straight ahead, through the corridor: Screen One. West wing for Screen Two, east wing for Screen Three. The statues are not for sitting on.', [['Thank you', 'greet'], ['Goodbye', 'end']]),
  } },
  usher: { start: 'greet', nodes: {
    greet: T('Evening! Ticket in hand? I shall walk you to your seat myself — mind the steps, they are dimmer than they look.', [['Show me to my seat', 'act:guide'], ['Any etiquette?', 'etiquette'], ['What is the best seat?', 'best'], ['Goodbye', 'end']]),
    etiquette: T('Phones silent, popcorn quiet, and applause always welcome at the end. The old projector is sensitive to gasps.', [['Ha — noted', 'greet'], ['Goodbye', 'end']]),
    best: T('Row D, dead centre, and no closer than two seats from the aisle. Any nearer and the picture swallows you whole.', [['Show me to my seat', 'act:guide'], ['Thanks', 'greet']]),
  } },
  barkeep: { start: 'greet', nodes: {
    greet: T('What will it be? A velvet fizz, something smoky, or something with no regrets at all?', [['A velvet fizz', 'act:drink'], ['Something smoky', 'strong'], ['Tell me a secret', 'gossip'], ['Goodbye', 'end']]),
    strong: T('Brave. One old-fashioned, stirred not shaken. (She slides a heavy glass across the marble.)', [['Cheers', 'act:drink'], ['Back', 'greet']]),
    gossip: T('They say the old projectionist still rewinds reels at midnight. If the lights flicker during the love scene, that is him — a romantic.', [['Ha! Another?', 'greet'], ['Goodbye', 'end']]),
  } },
  vendor: { start: 'greet', nodes: {
    greet: T('Popcorn, my friend? Salted or caramel — the kettle is hot and so is my temper if you say neither.', [['Salted, please', 'act:pop'], ['Caramel', 'act:pop'], ['Just looking', 'end']]),
  } },
  patron: { start: 'greet', nodes: {
    greet: T('{line}', [['Tell me more', 'more'], ['Enjoy the show', 'end']]),
    more: T('{line2}', [['Fascinating', 'end']]),
  } },
};
const PATRON_LINES = {
  'Mr. Hale': ['I saw the original run of The Long Night in ’58. They do not sing like that any more.', 'The trick is to sit where the sound lands — a third of the way back, slightly left.'],
  'Mrs. Hale': ['My husband will tell you he invented the cinema. Do not encourage him.', 'I come for the velvet. The pictures are a bonus.'],
  Lucille: ['I have seen every film here twice. Tonight is a third time, and I regret nothing.', 'If the curtain trembles before the film, that is the booth warming up. It is a good omen.'],
  'Mr. Orsini': ['Back home we had one screen and one lamp. This place is a palace.', 'Do not tell the manager, but I always bring my own salt.'],
  Ines: ['I am only wandering. The lobby is the best part, I think.', 'Look at the carpet — gold diamonds, teal dots. Someone loved this room.'],
  Anton: ['A bar stool, a cold drink and a good picture later. That is a perfect evening.', 'The barkeep makes a velvet fizz that could start a revolution.'],
  Vera: ['The sofa is far too comfortable. I may never see the film.', 'If you hear snoring during the quiet scenes, it is probably me.'],
};
export function treeFor(npc) {
  const t = TREES[npc.role] || TREES.patron; if (t !== TREES.patron) return t; const L = PATRON_LINES[npc.name] || ['Lovely evening, is it not?', 'I do adore a velvet seat.'];
  return { start: 'greet', nodes: { greet: T(L[0], t.nodes.greet.opts), more: T(L[1], t.nodes.more.opts) } };
}
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
