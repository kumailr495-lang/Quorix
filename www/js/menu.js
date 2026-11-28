// LUMIERE v14 - the menu (the user, 11-21: "the food you can do like categories and with their own icons and everything"; "make the ... food
// system huge with each of them having their own identity and detailed"). Six categories, twenty-six things, each with its own model
// (tools/blender/food14.py), its own picture (www/img/food: the model rendered), its own price, how many bites or sips it lasts and what
// you do with it. One list for the armrest tablet, the phone's Order app, the counters and the bill.
//   eat: bites (crunch); drink: sips (straw); hot: sips (a hot drink). also: a combo's second thing goes to a cup holder.
export const CATS = [
  { id: 'popcorn', icon: 'i-popcorn' }, { id: 'hot', icon: 'i-hotdog' }, { id: 'sweets', icon: 'i-icecream' },
  { id: 'cold', icon: 'i-soda' }, { id: 'hotdrinks', icon: 'i-coffee' }, { id: 'combos', icon: 'i-star' },
];
const I = (id, cat, price, model, use, bites, o = {}) => ({ id, cat, price, model, use, bites, img: o.img || (o.swap ? id : model.replace('food_', '')), swap: o.swap || null, also: o.also || null, veg: o.veg ?? true });
export const MENU = [
  I('salted', 'popcorn', 290, 'food_popcorn', 'eat', 9), I('caramel', 'popcorn', 340, 'food_popcorn', 'eat', 9, { swap: { popcorn: '#b8742c' } }),
  I('cheese', 'popcorn', 340, 'food_popcorn', 'eat', 9, { swap: { popcorn: '#e2a72a' } }), I('truffle', 'popcorn', 420, 'food_popcorn', 'eat', 10, { swap: { popcorn: '#d9c48e' } }),
  I('nachos', 'hot', 260, 'food_nachos', 'eat', 7), I('hotdog', 'hot', 280, 'food_hotdog', 'eat', 6, { veg: false }), I('burger', 'hot', 380, 'food_burger', 'eat', 7, { veg: false }),
  I('pizza', 'hot', 300, 'food_pizza', 'eat', 5, { veg: false }), I('fries', 'hot', 220, 'food_fries', 'eat', 8),
  I('icecream', 'sweets', 240, 'food_icecream', 'eat', 6), I('churros', 'sweets', 230, 'food_churros', 'eat', 6), I('choc', 'sweets', 150, 'food_choc', 'eat', 4), I('gummies', 'sweets', 170, 'food_gummies', 'eat', 8),
  I('cola', 'cold', 180, 'food_cup', 'drink', 8), I('lemonade', 'cold', 190, 'food_cup', 'drink', 8, { swap: { cup_band: '#e0b81c' } }),
  I('icedtea', 'cold', 190, 'food_cup', 'drink', 8, { swap: { cup_band: '#7a4a22' } }), I('shake', 'cold', 300, 'food_shake', 'drink', 7), I('slush', 'cold', 210, 'food_slush', 'drink', 8),
  I('water', 'cold', 60, 'food_water', 'drink', 6),
  I('espresso', 'hotdrinks', 160, 'food_coffee', 'hot', 3), I('cappuccino', 'hotdrinks', 210, 'food_coffee', 'hot', 6), I('latte', 'hotdrinks', 220, 'food_coffee', 'hot', 6),
  I('hotchoc', 'hotdrinks', 220, 'food_coffee', 'hot', 6, { swap: { kraft: '#4a2a18' } }), I('chai', 'hotdrinks', 150, 'food_chai', 'hot', 5),
  I('combo', 'combos', 460, 'food_popcorn', 'eat', 9, { also: 'cola' }), I('date', 'combos', 820, 'food_popcorn', 'eat', 10, { also: 'shake', swap: { popcorn: '#b8742c' }, img: 'caramel' }),
  I('sweettooth', 'combos', 520, 'food_churros', 'eat', 6, { also: 'hotchoc' }),
];
export const itemById = (id) => MENU.find((m) => m.id === id) || null;
// the old orders (v9-v13: coffee, mocktail) map onto the menu
const OLD = { coffee: 'latte', mocktail: 'lemonade' };
export const menuItem = (id) => itemById(OLD[id] || id) || itemById('salted');
export const PRICES = Object.fromEntries(MENU.map((m) => [m.id, m.price]).concat([['coffee', 220], ['mocktail', 190]]));
