export const recipes = [
  {
    id: 'burst-tomato-orzo',
    title: 'Burst Tomato Orzo',
    subtitle: 'One pan, glossy, and quietly luxurious.',
    description: 'Sweet tomatoes collapse into a silky garlic-basil sauce while orzo cooks right in the pan. Finished with parmesan, it tastes slow-cooked but is on the table in under half an hour.',
    cuisine: 'Italian-ish',
    minutes: 25,
    vegetarian: true,
    baseServings: 2,
    accent: '#dc5a3d',
    accentSoft: '#f1b29d',
    ingredients: [
      { id: 'tomatoes', name: 'Cherry tomatoes', qty: 300, unit: 'g', note: 'halved', model: 'tomato' },
      { id: 'orzo', name: 'Orzo', qty: 180, unit: 'g', model: 'pasta' },
      { id: 'garlic', name: 'Garlic', qty: 2, unit: 'clove', note: 'thinly sliced', model: 'garlic' },
      { id: 'basil', name: 'Fresh basil', qty: 0.5, unit: 'cup', note: 'torn', model: 'basil' },
      { id: 'parmesan', name: 'Parmesan', qty: 40, unit: 'g', note: 'finely grated', model: 'cheese' },
      { id: 'olive-oil', name: 'Olive oil', qty: 2, unit: 'tbsp', model: 'oil' }
    ],
    steps: [
      { title: 'Get the water going', timer: '5 min', body: 'Bring a kettle of water to a boil. Set a wide, deep skillet over medium heat and add the olive oil. While the pan warms, halve the tomatoes, slice the garlic, and tear the basil.' },
      { title: 'Blister the tomatoes', timer: '4–5 min', body: 'Add the tomatoes cut-side down to the skillet with a generous pinch of salt. Leave them alone for a few minutes, then stir once. They should slump, blister, and release their juices without turning to mush.' },
      { title: 'Toast the orzo', timer: '2 min', body: 'Push the tomatoes to one side and add the garlic and orzo. Stir the orzo in the glossy tomato oil for two minutes until the grains smell toasted and turn a shade deeper gold.' },
      { title: 'Simmer until tender', timer: '10–12 min', body: 'Pour in 2 cups of the hot water and scrape up anything sticking to the pan. Simmer gently, stirring often, until the orzo is tender and the liquid has become a loose, silky sauce. Add a splash more water if needed.' },
      { title: 'Finish at the counter', timer: '1 min', body: 'Take the pan off the heat. Fold in the parmesan, basil, and several grinds of black pepper. Taste, add salt if it needs it, and serve right away with an extra drizzle of olive oil.' }
    ],
    tip: 'Keep the finished orzo a little looser than you think—it thickens quickly as it cools.'
  },
  {
    id: 'smoky-chickpea-tacos',
    title: 'Smoky Chickpea Tacos',
    subtitle: 'Crisp, bright, and built for a crowd.',
    description: 'Crunchy spiced chickpeas meet quick-pickled cabbage and a cool lime crema. Warm tortillas turn everything into a fast, colorful dinner with plenty of texture.',
    cuisine: 'Mexican-inspired',
    minutes: 30,
    vegetarian: true,
    baseServings: 2,
    accent: '#d89a32',
    accentSoft: '#f0d6a1',
    ingredients: [
      { id: 'chickpeas', name: 'Chickpeas', qty: 400, unit: 'g', note: 'drained and patted dry', model: 'chickpea' },
      { id: 'tortillas', name: 'Small tortillas', qty: 4, unit: 'tortilla', model: 'tortilla' },
      { id: 'cabbage', name: 'Red cabbage', qty: 200, unit: 'g', note: 'thinly shredded', model: 'cabbage' },
      { id: 'lime', name: 'Lime', qty: 1, unit: '', note: 'zested and juiced', model: 'lime' },
      { id: 'yogurt', name: 'Greek yogurt', qty: 0.5, unit: 'cup', model: 'yogurt' },
      { id: 'cumin', name: 'Ground cumin', qty: 1, unit: 'tsp', model: 'spice', spiceColor: '#b8742f' },
      { id: 'olive-oil', name: 'Olive oil', qty: 1, unit: 'tbsp', model: 'oil' }
    ],
    steps: [
      { title: 'Crisp the chickpeas', timer: '8–10 min', body: 'Heat the olive oil in a large frying pan over medium-high heat. Add the well-dried chickpeas and cook, shaking the pan now and then, until the skins are blistered and the edges are crisp. Stir in the cumin and a big pinch of salt.' },
      { title: 'Quick-pickle the cabbage', timer: '5 min', body: 'Toss the shredded cabbage with half of the lime juice and a pinch of salt. Scrunch it with your hands for a few seconds, then leave it to sit while everything else comes together. It should stay crunchy but taste seasoned.' },
      { title: 'Make the lime crema', body: 'Stir the yogurt with the lime zest, the remaining lime juice, and a pinch of salt. If it is very thick, loosen it with a teaspoon of water. Taste and add more lime if you want a sharper edge.' },
      { title: 'Warm the tortillas', timer: '2 min', body: 'Set a dry skillet over medium heat. Warm each tortilla for about 30 seconds on each side, stacking them under a clean towel as you go. This keeps them soft and steamy.' },
      { title: 'Build the tacos', body: 'Spoon the chickpeas into the warm tortillas. Top with a tangle of pink cabbage, a swoosh of lime crema, and plenty of black pepper. Serve immediately, with extra lime on the table.' }
    ],
    tip: 'Dry the chickpeas thoroughly before they hit the pan—moisture is the enemy of crunch.'
  },
  {
    id: 'miso-butter-salmon',
    title: 'Miso Butter Salmon',
    subtitle: 'A glossy sheet-pan dinner with almost no cleanup.',
    description: 'Salmon roasts over a bed of bok choy with a savory-sweet miso butter spooned on top. Fluffy rice and scallions make it a complete weeknight plate.',
    cuisine: 'Japanese-inspired',
    minutes: 25,
    vegetarian: false,
    baseServings: 2,
    accent: '#c56b58',
    accentSoft: '#e8b7aa',
    ingredients: [
      { id: 'salmon', name: 'Salmon fillets', qty: 2, unit: 'fillet', model: 'salmon' },
      { id: 'bok-choy', name: 'Baby bok choy', qty: 2, unit: 'head', note: 'halved', model: 'bokchoy' },
      { id: 'rice', name: 'Jasmine rice', qty: 0.75, unit: 'cup', model: 'rice' },
      { id: 'miso', name: 'White miso', qty: 2, unit: 'tbsp', model: 'miso' },
      { id: 'butter', name: 'Butter', qty: 2, unit: 'tbsp', model: 'butter' },
      { id: 'scallions', name: 'Scallions', qty: 2, unit: 'stalk', note: 'thinly sliced', model: 'scallion' },
      { id: 'sesame', name: 'Sesame seeds', qty: 1, unit: 'tsp', model: 'sesame' }
    ],
    steps: [
      { title: 'Start the rice', timer: '15 min', body: 'Rinse the rice until the water runs mostly clear. Combine it with 1½ cups water and a pinch of salt in a small saucepan. Bring to a boil, cover, and cook on the lowest heat for 13 minutes. Let it rest, covered, for 5 minutes.' },
      { title: 'Mix the miso butter', body: 'Mash the softened butter with the miso until smooth. Stir in a tablespoon of hot water to make a spoonable glaze. Taste it: it should be savory, a little sweet, and salty enough to season the fish.' },
      { title: 'Set up the tray', timer: '3 min', body: 'Heat the oven to 220°C / 425°F. Line a small tray with parchment. Arrange the bok choy cut-side up, rub it with a little oil, and nestle the salmon fillets beside it. Pat the salmon dry and season lightly.' },
      { title: 'Roast and glaze', timer: '10–12 min', body: 'Spoon most of the miso butter over the salmon. Roast until the fish is just opaque at the center and the bok choy is tender at the stem, about 10–12 minutes. Spoon the remaining miso butter over the hot tray.' },
      { title: 'Finish the bowls', body: 'Fluff the rice and divide it between bowls. Add the bok choy and salmon, then spoon over the pan juices. Scatter with scallions and sesame seeds. Serve with extra black pepper and a wedge of lime if you have one.' }
    ],
    tip: 'Pull the salmon from the oven when the center still looks a shade translucent—it will finish cooking as it rests.'
  },
  {
    id: 'sweet-potato-coconut-curry',
    title: 'Sweet Potato Coconut Curry',
    subtitle: 'A cozy pot with enough leftovers for tomorrow.',
    description: 'Tender sweet potato and chickpeas simmer in a coconut curry sauce until thick and comforting. Spinach goes in at the end for a bright green finish over rice.',
    cuisine: 'Thai-inspired',
    minutes: 35,
    vegetarian: true,
    baseServings: 2,
    accent: '#d4762f',
    accentSoft: '#efc59f',
    ingredients: [
      { id: 'sweet-potato', name: 'Sweet potatoes', qty: 500, unit: 'g', note: 'peeled, 2 cm cubes', model: 'sweetpotato' },
      { id: 'coconut-milk', name: 'Coconut milk', qty: 400, unit: 'ml', model: 'coconut' },
      { id: 'chickpeas', name: 'Chickpeas', qty: 400, unit: 'g', note: 'drained', model: 'chickpea' },
      { id: 'spinach', name: 'Baby spinach', qty: 3, unit: 'cup', model: 'spinach' },
      { id: 'curry-paste', name: 'Red curry paste', qty: 2, unit: 'tbsp', model: 'curry' },
      { id: 'rice', name: 'Jasmine rice', qty: 1, unit: 'cup', model: 'rice' },
      { id: 'lime', name: 'Lime', qty: 1, unit: '', note: 'cut into wedges', model: 'lime' }
    ],
    steps: [
      { title: 'Bloom the curry paste', timer: '2 min', body: 'Set a heavy pot over medium heat and add a tablespoon of oil. Spoon in the curry paste and fry it for a minute or two, stirring constantly, until it smells fragrant and darkens slightly at the edges.' },
      { title: 'Build the coconut base', body: 'Pour in the coconut milk and ½ cup water, scraping up the paste. Add the sweet potato and a big pinch of salt. Bring to a gentle simmer, then cover and cook until the potato is almost tender.' },
      { title: 'Add the chickpeas', timer: '8–10 min', body: 'Stir in the chickpeas and simmer uncovered for another 8–10 minutes. The sauce should thicken enough to coat a spoon. If it gets too thick before the potato is ready, add a splash of water.' },
      { title: 'Cook the rice', timer: '15 min', body: 'While the curry simmers, rinse the rice and cook it with 1¾ cups water and a pinch of salt. Keep it covered on the lowest heat for 13 minutes, then let it steam off the heat for 5 minutes before fluffing.' },
      { title: 'Wilt the spinach', timer: '1 min', body: 'Turn off the heat and fold in the spinach in handfuls until just wilted. Taste the curry and adjust with salt and a squeeze of lime. The lime should wake up the coconut and make the whole pot taste brighter.' },
      { title: 'Serve', body: 'Spoon the curry over rice and add lime wedges to each bowl. Finish with a little more lime juice at the table and plenty of black pepper. Leftovers keep well for three days in the fridge.' }
    ],
    tip: 'Cut the sweet potato into even pieces so the curry finishes at the same time.'
  },
  {
    id: 'lemon-garlic-chicken',
    title: 'Lemon Garlic Chicken',
    subtitle: 'Golden chicken and potatoes from one hot tray.',
    description: 'Crisp-skinned chicken thighs roast with baby potatoes, whole garlic, and lemon. A quick pan sauce turns the drippings into something worth spooning over everything.',
    cuisine: 'Mediterranean',
    minutes: 40,
    vegetarian: false,
    baseServings: 2,
    accent: '#a9a34b',
    accentSoft: '#ded8a0',
    ingredients: [
      { id: 'chicken', name: 'Chicken thighs', qty: 4, unit: 'thigh', note: 'skin-on, bone-in', model: 'chicken' },
      { id: 'potatoes', name: 'Baby potatoes', qty: 500, unit: 'g', note: 'halved', model: 'potato' },
      { id: 'lemon', name: 'Lemon', qty: 1, unit: '', note: 'zested and sliced', model: 'lemon' },
      { id: 'garlic', name: 'Garlic', qty: 4, unit: 'clove', note: 'smashed', model: 'garlic' },
      { id: 'thyme', name: 'Thyme', qty: 6, unit: 'sprig', model: 'thyme' },
      { id: 'olive-oil', name: 'Olive oil', qty: 2, unit: 'tbsp', model: 'oil' },
      { id: 'dijon', name: 'Dijon mustard', qty: 1, unit: 'tbsp', model: 'jar', jarColor: '#d5ad4a' }
    ],
    steps: [
      { title: 'Heat the oven', timer: '10 min', body: 'Heat the oven to 220°C / 425°F. Bring a small pan of salted water to a boil. Add the halved potatoes and cook for 7 minutes, then drain well. This head start helps them crisp without burning.' },
      { title: 'Season the chicken', timer: '3 min', body: 'Pat the chicken very dry and season all over with salt and pepper. Rub the skin with a little olive oil. Toss the drained potatoes with the remaining oil, half the lemon zest, and a pinch of salt.' },
      { title: 'Build the tray', body: 'Arrange the chicken skin-side up on a large tray with the potatoes around it. Tuck in the smashed garlic, thyme sprigs, and lemon slices. Keep the chicken in a single layer so the skin can get properly crisp.' },
      { title: 'Roast until golden', timer: '25–30 min', body: 'Roast until the skin is deeply golden and the chicken reaches 74°C / 165°F at the thickest part. Turn the potatoes once halfway through. If the lemon slices start to darken too much, move them under the chicken.' },
      { title: 'Make the pan sauce', timer: '2 min', body: 'Move the chicken to a warm plate. Set the tray over medium heat on the stove. Stir in the Dijon and the juice of half the lemon, scraping up the browned bits. Add a splash of water if the sauce looks tight.' },
      { title: 'Rest and serve', body: 'Spoon the pan sauce over the chicken and potatoes. Squeeze over the remaining lemon and scatter with fresh thyme. Serve straight from the tray with a sharp green salad on the side.' }
    ],
    tip: 'Dry chicken skin and a hot oven are the two secrets to a crackly finish.'
  },
  {
    id: 'gochujang-beef-bowls',
    title: 'Gochujang Beef Bowls',
    subtitle: 'Sweet-heat beef with cool cucumber and rice.',
    description: 'A fast, glossy beef skillet with gochujang, sesame, and scallions. Cool cucumber and hot rice keep every bite balanced.',
    cuisine: 'Korean-inspired',
    minutes: 25,
    vegetarian: false,
    baseServings: 2,
    accent: '#b74436',
    accentSoft: '#e4a49b',
    ingredients: [
      { id: 'beef', name: 'Ground beef', qty: 400, unit: 'g', model: 'beef' },
      { id: 'rice', name: 'Cooked rice', qty: 2, unit: 'cup', model: 'rice' },
      { id: 'cucumber', name: 'Cucumber', qty: 1, unit: '', note: 'thinly sliced', model: 'cucumber' },
      { id: 'gochujang', name: 'Gochujang', qty: 2, unit: 'tbsp', model: 'jar', jarColor: '#a92f24' },
      { id: 'sesame-oil', name: 'Toasted sesame oil', qty: 1, unit: 'tbsp', model: 'oil', oilColor: '#9b5a25' },
      { id: 'scallions', name: 'Scallions', qty: 3, unit: 'stalk', note: 'sliced', model: 'scallion' },
      { id: 'sesame', name: 'Sesame seeds', qty: 1, unit: 'tsp', model: 'sesame' }
    ],
    steps: [
      { title: 'Mix the sauce', body: 'In a small bowl, stir the gochujang with the sesame oil, a tablespoon of water, and a pinch of sugar if you have it. The sauce should be thick enough to cling to a spoon but loose enough to drizzle.' },
      { title: 'Brown the beef', timer: '6–8 min', body: 'Heat a wide skillet over medium-high heat. Add the beef and press it into an even layer. Leave it undisturbed for two minutes, then break it up and continue cooking until the edges are browned and most of the liquid has cooked away.' },
      { title: 'Toss the cucumber', body: 'While the beef cooks, toss the cucumber slices with a pinch of salt and a splash of rice vinegar if you have some. Let them sit for five minutes, then drain off any water. This keeps the bowl crisp and fresh.' },
      { title: 'Glaze the beef', timer: '2 min', body: 'Pour the gochujang sauce into the skillet and stir until every piece of beef is glossy. Cook for another minute so the sauce thickens. Taste and add a splash of water or a pinch of salt as needed.' },
      { title: 'Build the bowls', body: 'Divide the warm rice between bowls. Add the beef, cucumber, and a generous handful of scallions. Finish with sesame seeds and extra gochujang on the side for anyone who wants more heat.' }
    ],
    tip: 'Let the beef sit without stirring at first—that is how you get browned edges instead of steamed mince.'
  },
  {
    id: 'green-goddess-grain-bowls',
    title: 'Green Goddess Grain Bowls',
    subtitle: 'Herby, crunchy, and ready in twenty minutes.',
    description: 'Nutty farro, creamy avocado, and snappy cucumber get coated in a bright herb-and-yogurt dressing. Feta and lemon make it a lunch that actually keeps you full.',
    cuisine: 'Californian',
    minutes: 20,
    vegetarian: true,
    baseServings: 2,
    accent: '#68845e',
    accentSoft: '#b9c9ae',
    ingredients: [
      { id: 'farro', name: 'Quick-cooking farro', qty: 1, unit: 'cup', model: 'farro' },
      { id: 'avocado', name: 'Avocado', qty: 1, unit: '', note: 'sliced', model: 'avocado' },
      { id: 'cucumber', name: 'Cucumber', qty: 1, unit: '', note: 'diced', model: 'cucumber' },
      { id: 'basil', name: 'Fresh basil', qty: 1, unit: 'cup', model: 'basil' },
      { id: 'yogurt', name: 'Greek yogurt', qty: 0.5, unit: 'cup', model: 'yogurt' },
      { id: 'lemon', name: 'Lemon', qty: 1, unit: '', note: 'juiced', model: 'lemon' },
      { id: 'feta', name: 'Feta', qty: 80, unit: 'g', note: 'crumbled', model: 'feta' }
    ],
    steps: [
      { title: 'Cook the farro', timer: '10–12 min', body: 'Rinse the farro and simmer it in plenty of salted water until tender with a little chew. Drain well and spread it on a plate to cool for a minute so it does not steam into a sticky clump.' },
      { title: 'Blitz the green dressing', body: 'Blend or finely chop the basil with the yogurt, lemon juice, a pinch of salt, and a few tablespoons of water. Taste it. It should be bright enough to make you pucker slightly, because it will tone down once mixed with the grains.' },
      { title: 'Prep the vegetables', body: 'Dice the cucumber and slice the avocado. Squeeze a little lemon over the avocado to keep it green. Crumble the feta and set aside a few small basil leaves for the top of the bowls.' },
      { title: 'Toss while warm', body: 'Put the warm farro in a large bowl and toss it with half the green dressing. Let it sit for a minute so the grains absorb the herbs. Taste and add salt or lemon if the farro still tastes flat.' },
      { title: 'Assemble the bowls', body: 'Divide the dressed farro between bowls. Arrange the cucumber, avocado, and feta on top. Spoon over the remaining dressing and finish with the reserved basil leaves and a crack of black pepper.' }
    ],
    tip: 'Dressing the grains while they are warm is the difference between a good bowl and a great one.'
  },
  {
    id: 'herby-mushroom-toast',
    title: 'Herby Mushroom Toast',
    subtitle: 'Golden mushrooms, whipped ricotta, and a very good slice.',
    description: 'Buttery mushrooms and garlic pile onto crisp sourdough spread with lemon-whipped ricotta. It is toast, but it is also dinner.',
    cuisine: 'Modern bistro',
    minutes: 15,
    vegetarian: true,
    baseServings: 2,
    accent: '#86694e',
    accentSoft: '#cbb39d',
    ingredients: [
      { id: 'sourdough', name: 'Sourdough bread', qty: 4, unit: 'slice', model: 'bread' },
      { id: 'mushrooms', name: 'Mushrooms', qty: 300, unit: 'g', note: 'roughly torn', model: 'mushroom' },
      { id: 'ricotta', name: 'Ricotta', qty: 0.75, unit: 'cup', model: 'ricotta' },
      { id: 'garlic', name: 'Garlic', qty: 2, unit: 'clove', note: 'finely grated', model: 'garlic' },
      { id: 'thyme', name: 'Thyme', qty: 6, unit: 'sprig', note: 'leaves picked', model: 'thyme' },
      { id: 'butter', name: 'Butter', qty: 2, unit: 'tbsp', model: 'butter' },
      { id: 'lemon', name: 'Lemon', qty: 0.5, unit: '', note: 'zested', model: 'lemon' }
    ],
    steps: [
      { title: 'Toast the bread', timer: '3 min', body: 'Toast the sourdough until crisp and deeply golden at the edges. While it is still hot, rub one side lightly with a cut garlic clove if you have an extra one. Set the slices on a warm plate.' },
      { title: 'Brown the mushrooms', timer: '7–8 min', body: 'Melt the butter in a wide pan over medium-high heat. Add the mushrooms in a single layer and leave them for two minutes before stirring. Cook until browned and squeaky, then add the garlic, thyme, and a big pinch of salt.' },
      { title: 'Whip the ricotta', body: 'Stir the ricotta with the lemon zest, a pinch of salt, and a splash of olive oil until smooth and spreadable. Taste it—it should be gently lemony and seasoned enough on its own.' },
      { title: 'Pile and finish', body: 'Spread the ricotta thickly on the toast and spoon the hot mushrooms on top. Add a little more thyme, a crack of black pepper, and a squeeze of lemon. Eat immediately, with a napkin nearby.' }
    ],
    tip: 'Do not crowd the mushrooms. Give them room to brown instead of steaming in the butter.'
  }
];

export const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
