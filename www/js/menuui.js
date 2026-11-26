// LUMIERE v14 - the menu as a screen (the armrest tablet's Order tab and the phone's Order app share it): category tabs with their icons,
// a card per item with its picture (the item's model rendered: www/img/food), its name, a line about it, a green or red mark (vegetarian
// or not, as Indian menus show), its price and an Order button. o: { order(id) -> true when ordered, price(id) -> text, free: bool,
// sound, toast, compact: phone layout }
import { t } from './i18n.js';
import { CATS, MENU } from './menu.js';

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const icon = (id) => `<svg class="ic"><use href="#${id}"/></svg>`;
let lastCat = 'popcorn';

export function renderMenu(root, o) {
  root.innerHTML = ''; root.classList.add('mn-root'); if (o.compact) root.classList.add('mn-compact');
  const tabs = el('div', 'mn-cats'), grid = el('div', 'mn-grid');
  const show = (cat) => {
    lastCat = cat; for (const b of tabs.children) b.classList.toggle('on', b.dataset.c === cat); grid.innerHTML = '';
    for (const it of MENU.filter((m) => m.cat === cat)) {
      const card = el('div', 'mn-card'), pic = el('div', 'mn-pic'), img = new Image(); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.src = `img/food/${it.img}.webp`; pic.appendChild(img);
      const mark = el('i', 'mn-veg ' + (it.veg ? 'v' : 'nv')); mark.setAttribute('aria-label', t(it.veg ? 'menu.veg' : 'menu.nonveg'));   // v14b beside the name (it sat over the picture)
      const info = el('div', 'mn-info'), name = el('b', null, t('food.' + it.id)); name.prepend(mark); info.append(name, el('small', null, t('food.d.' + it.id)));
      const row = el('div', 'mn-row'), price = el('span', 'mn-price', o.free ? t('menu.free') : o.price(it.id)), go = el('button', 'btn primary sm mn-go', t('menu.order'));
      go.addEventListener('click', (e) => { e.stopPropagation(); o.sound && o.sound.click(); if (o.order(it.id)) { card.classList.add('ok'); setTimeout(() => card.classList.remove('ok'), 900); } });
      row.append(price, go); info.appendChild(row); card.append(pic, info); grid.appendChild(card);
    }
  };
  for (const c of CATS) { const b = el('button', 'mn-cat'); b.dataset.c = c.id; b.innerHTML = `${icon(c.icon)}<span>${t('cat.' + c.id)}</span>`; b.addEventListener('click', (e) => { e.stopPropagation(); o.sound && o.sound.click(); show(c.id); }); tabs.appendChild(b); }
  root.append(tabs, grid); show(CATS.some((c) => c.id === lastCat) ? lastCat : CATS[0].id);
}
