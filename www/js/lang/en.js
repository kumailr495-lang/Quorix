// English (source language). Keys are shared by es.js, hi.js and ur.js.
export const EN = {
  // ---- loading / menu ----
  'load.title': 'LUMIÈRE', 'load.sub': 'Cinema', 'load.lobby': 'Building the lobby', 'load.gallery': 'Lighting the gallery', 'load.tunnel': 'Starting the video tunnel', 'load.restrooms': 'Polishing the restrooms', 'load.street': 'Switching on the street', 
  'load.halls': 'Setting up the screens', 'load.bake': 'Lighting {room}', 'load.people': 'Seating the guests', 'load.ready': 'Ready',
  'tips': ['Tip: the usher by the screens will walk you to your seat.', 'Tip: popcorn is at the red counter on the right.', 'Tip: tap the eye icon to hide the controls during a film.', 'Tip: you can play your own video on any screen. Ask at Tickets.', 'Tip: Screen 3 is the giant one. Sit in the middle rows.', 'Tip: hold Sprint to move faster in the lobby.'],
  'menu.play': 'Enter the cinema', 'menu.continue': 'Continue', 'menu.settings': 'Settings', 'menu.language': 'Language', 'menu.help': 'How to play', 'menu.credits': 'Credits', 'menu.quit': 'Back to menu', 'menu.resume': 'Resume', 'menu.paused': 'Paused',
  'menu.tagline': 'Three screens. One night out.',
  'help.body': 'Move with the stick on the left. Drag anywhere else to look around. Walk up to people and tap Talk. Book a ticket at Tickets, grab snacks at the red counter, then follow the usher or the glowing path to your seat. Tap the eye icon to hide the controls while you watch.',
  'credits.body': 'LUMIÈRE v5. Everything you see and hear is generated in code: the building, the people, the films and the sound. Made for phones.',
  // ---- settings ----
  'set.title': 'Settings', 'set.controls': 'Controls', 'set.sens': 'Look sensitivity', 'set.invert': 'Invert look', 'set.graphics': 'Graphics', 'set.quality': 'Quality', 'set.low': 'Low', 'set.medium': 'Medium', 'set.high': 'High',
  'set.autores': 'Auto resolution', 'set.bright': 'Brightness', 'set.sound': 'Sound', 'set.master': 'Master volume', 'set.film': 'Film volume', 'set.crowd': 'Crowd volume', 'set.lang': 'Language', 'set.fps': 'Show FPS', 'set.bubbles': 'Speech bubbles',
  'set.restart': 'Some changes apply after you reopen the app.', 'set.done': 'Done', 'on': 'On', 'off': 'Off',
  // ---- HUD ----
  'hud.talk': 'Talk to {name}', 'hud.sit': 'Sit down', 'hud.sitSeat': 'Sit · {seat}', 'hud.yourSeat': 'Sit · {seat} (yours)', 'hud.stand': 'Stand up', 'hud.eat': 'Eat', 'hud.sip': 'Sip', 'hud.findSeat': 'Find my seat', 'hud.hide': 'Hide controls', 'hud.show': 'Show controls', 'hud.menu': 'Menu', 'hud.sprint': 'Sprint',
  'room.lobby': 'Lobby', 'room.gal': 'Gallery · Screens 1 2 3', 'room.tunnel': 'Tunnel to Screen 2 · IMAX', 'room.wcM': 'Restroom · Gentlemen', 'room.wcF': 'Restroom · Ladies', 'room.street': 'Street',
  'show.idle': 'between shows', 'show.pending': 'starts in {time}', 'show.preshow': 'starting soon', 'show.playing': 'now showing', 'show.ended': 'the end',
  'ticket.chip': '{screen} · Row {row} · Seat {seat}', 'rotate': 'Turn your phone sideways', 'pre.silence': 'Please silence your phone', 'pre.soon': 'Starting soon',
  // ---- toasts ----
  'toast.welcome': 'Welcome to LUMIÈRE', 'toast.noTicket': 'Book a ticket at Tickets first.', 'toast.follow': 'Follow the glowing path', 'toast.followUsher': 'Follow {name}', 'toast.lightsDown': 'The lights are going down…',
  'toast.starting': '{screen} is starting. Follow the path to your seat.', 'toast.end': 'The End. Thanks for coming!', 'toast.videoError': 'That video could not be played. Try another file or a direct .mp4 link.',
  'toast.gotPopcorn': 'You got {item}', 'toast.empty': 'All gone. Very efficient.', 'toast.ownReady': 'Your video is ready. Pick a seat and confirm.', 'toast.badLink': 'Paste a direct link that starts with http(s)://',
  'toast.seatTaken': 'That seat is taken.', 'toast.uiHidden': 'Controls hidden. Tap the eye to bring them back.',
  // ---- booking ----
  'book.title': 'Book a ticket', 'book.film': 'Film', 'book.when': 'Starts', 'book.now': 'Now', 'book.1m': 'In 1 min', 'book.3m': 'In 3 min', 'book.seat': 'Choose your seat', 'book.screen': 'Screen',
  'book.own': 'Your own video (optional)', 'book.gallery': 'From gallery', 'book.link': 'Paste a video link (.mp4 / .webm)', 'book.useLink': 'Use link', 'book.ownNone': 'None. The house film will play.', 'book.ownSet': 'Ready: {name}',
  'book.selected': 'Row {row} · Seat {seat}', 'book.full': 'This screen is full', 'book.confirm': 'Confirm', 'book.free': 'Free', 'book.taken': 'Taken', 'book.yours': 'Yours', 'book.mins': '{n} min',
  'kind.standard': 'Standard', 'kind.curved': 'Curved Premium · recliners', 'kind.imax': 'IMAX · 22 m screen',
  'genre.thriller': 'Thriller', 'genre.romance': 'Romance', 'genre.horror': 'Horror',
  'tk.admit': 'Admit one', 'tk.screen': 'Screen', 'tk.row': 'Row', 'tk.seat': 'Seat', 'tk.walk': 'Walk there', 'tk.jump': 'Take me to my seat', 'tk.hint': 'The usher can walk you there, or follow the glowing path.',
  // ---- items ----
  'item.salted': 'salted popcorn', 'item.caramel': 'caramel popcorn', 'item.cola': 'a cold cola', 'item.coffee': 'a coffee', 'item.mocktail': 'a Plot Twist mocktail', 'item.combo': 'popcorn and a drink',
  // ---- roles ----
  'role.reception': 'Tickets', 'role.usher': 'Usher', 'role.vendor': 'Snacks', 'role.bar': 'Bar & Café', 'role.guest': 'Guest',
  // ---- dialogue: reception ----
  'rec.greet': 'Hi, welcome to LUMIÈRE! Three screens tonight, and yes, the popcorn costs about as much as a small car. What can I do for you?',
  'rec.films': 'Screen 1: The Long Night. Car chases, explosions, a man brooding at a window. Screen 2: Velvet Hour, a romance on our curved screen. Bring tissues. Screen 3, the giant one: A Quiet Room. It’s horror. People scream. Some of them are in the film.',
  'rec.own': 'Pick a video from your phone or paste a link and we’ll play it on the big screen. Yes, even the one of your cat. Especially the one of your cat.',
  'rec.where': 'Snacks on the right, bar and café behind the wooden screen on the left, and the screens straight through the back, past the usher. Restrooms are at both ends of the corridor. You’re welcome.',
  'rec.booked': 'Done! The usher by the screens can walk you to your seat, if you’d rather not end up in the wrong film.',
  'opt.book': 'Book a ticket', 'opt.films': 'What’s showing?', 'opt.own': 'Can I play my own video?', 'opt.where': 'Where is everything?', 'opt.bye': 'Bye', 'opt.thanks': 'Thanks', 'opt.back': 'Something else', 'opt.more': 'Go on',
  // ---- usher ----
  'ush.greet': 'Ticket? Lovely. Want me to walk you to your seat? I know these stairs better than my own family.',
  'ush.noTicket': 'No ticket, no magic. Tickets is on the left, under the giant sign that says TICKETS. Very subtle, I know.',
  'ush.tips': 'Phone on silent, no kicking the seat in front, and if you talk during the film I will appear behind you. Silently. Like a ghost with a torch.',
  'ush.best': 'Screen 3 for the giant picture, Screen 2 if you want to lie down and feel fancy, Screen 1 if you just want a film and to keep your dignity.',
  'ush.follow': ['Follow me, please.', 'This way. Mind the steps.', 'Right behind me. Don’t get distracted by the popcorn.'],
  'ush.wait': ['Keep up, the stairs don’t climb themselves.', 'Over here!', 'Still with me?'],
  'ush.arrive': 'Row {row}, seat {seat}. Your throne awaits. Enjoy the film!', 'ush.blocked': 'Hmm, the way is blocked. Follow the glowing path instead.',
  'opt.guide': 'Show me my seat', 'opt.tips': 'Any tips?', 'opt.best': 'Which screen is best?',
  // ---- snacks ----
  'ven.greet': 'Hey! What’ll it be? Popcorn, a drink, or a combo you’ll regret halfway through?',
  'ven.serve': 'One {item}, coming up.', 'ven.give': ['There you go. Mind the butter, it’s basically lava.', 'Enjoy! Crumbs go on the floor, apparently.', 'Here. Don’t let anyone steal it. They will try.'],
  'ven.full': 'You’re already holding one. I admire the ambition, but finish that first.',
  'opt.salted': 'Salted popcorn', 'opt.caramel': 'Caramel popcorn', 'opt.cola': 'A cold cola', 'opt.combo': 'Combo', 'opt.look': 'Just looking',
  // ---- bar ----
  'bar.greet': 'Evening. Coffee, a soda, or our famous mocktail, the Plot Twist?', 'bar.gossip': 'The projectionist names every projector. The one in Screen 3 is called Gerald. Gerald has never failed. Do not jinx Gerald.',
  'bar.serve': 'Here you go. If anyone asks, it’s very sophisticated.', 'opt.coffee': 'Coffee', 'opt.mocktail': 'The Plot Twist', 'opt.soda': 'A soda', 'opt.gossip': 'Any gossip?',
  // ---- guests ----
  'guest.small': ['Is it just me, or are the seats in Screen 2 basically beds?', 'I came for the film. I stayed for the nachos.', 'My friend says this film is “mid”. My friend also eats pizza with a fork.', 'I always cry at the trailers. Don’t tell anyone.',
    'Last time someone’s phone rang during the scary part. It was mine.', 'They say Screen 3’s sound shakes your soul. Mine is already shaken.', 'I’m not scared of horror films. I just like watching them through my fingers.', 'Does the popcorn guy judge people who get a large? Because I’m getting a large.'],
  'guest.more': ['Anyway. Enjoy the film!', 'Sit in the middle. Trust me.', 'Don’t tell the usher I said that.'],
  'chat': [['Which one are we watching?', 'The horror one.', 'You screamed at a moth last week.', 'That moth was huge.'], ['Did you bring snacks?', 'I brought a whole bag.', 'They’ll see.', 'They’ll see a man who came prepared.'],
    ['Big screen or curved screen?', 'Big. I want to feel small.', 'You always feel small.', 'Wow. Okay. Big screen it is.'], ['Should we get a large popcorn?', 'We are getting two large popcorns.', 'That’s a lot.', 'That’s a statement.'],
    ['I heard the ending is a twist.', 'Don’t.', 'I wasn’t going to—', 'DON’T.'], ['Phone off?', 'It’s on silent.', 'Vibrate isn’t silent.', '…It’s on silent now.']],
  'greet': ['Evening!', 'Hi there!', 'Oh, hello!', 'Nice night for a film.'],
  'bark.reception': ['Next, please!', 'No, the large is not “basically the same” as the medium.', 'Screen 3 is the big one. Like, really big.', 'Phones on silent in there, please. I’m begging.'],
  'bark.usher': ['Screens this way!', 'Mind the step.', 'Tickets ready, folks.', 'Yes, the screen really is that big.'],
  'bark.vendor': ['Fresh popcorn, still popping!', 'Caramel’s warm, just saying.', 'A large is only one more. One more what? Exactly.'], 'bark.bar': ['Coffee’s fresh.', 'Plot Twist, anyone? It’s just juice, but dramatic.'],
  // ---- audience ----
  'aud.pre': ['Phones off, everyone.', 'Ooh, it’s starting!', 'Can you see? I can see.', 'Who sits in the front row on purpose?', 'Pass the popcorn.'],
  'aud.scare': ['NOPE.', 'Why would you go in there?!', 'I’m fine. Totally fine.', 'I’m leaving. …After this scene.'], 'aud.tension': ['Don’t open the door…', 'Here it comes…', 'I can’t look.'],
  'aud.laugh': ['Ha! Classic.', 'Did not see that coming.', 'Stop, I’m crying.'], 'aud.aww': ['Aww.', 'That’s so sweet.', 'I’m not crying, you’re crying.'], 'aud.climax': ['YES!', 'Let’s go!', 'Whoa!'],
  'aud.shush': ['Shh!', 'Some of us are watching!', 'Shhh!'], 'aud.end': ['Bravo!', 'That was amazing!', 'Okay, that was worth it.', 'I need a minute.'], 'aud.cat': 'It was a cat. Of course it was a cat.',
  'aud.excuse': ['Excuse me.', 'Squeeze by, it’s fine.', 'Mind my popcorn!'], 'aud.downFront': ['Down in front!', 'Excuse you!'],
  'menu.nowShowing': 'Now showing', 'book.step1': 'Choose a film', 'book.step3': 'Confirm your ticket', 'book.next': 'Next', 'book.back': 'Back', 'book.fullHint': 'Every seat is taken. Try another film.', 'lang.title': 'Choose your language',
};
