export const recipes = [
  {
    id: 'lemon-herb-chicken',
    title: 'Lemon-Herb Chicken',
    kicker: 'with crisp asparagus & pan jus',
    description:
      'Golden chicken, bright lemon, and asparagus that still has a little snap. One pan, plenty of sauce, and almost nothing to wash up.',
    category: 'One pan',
    accent: '#c9892d',
    vegetarian: false,
    prep: 15,
    cook: 25,
    baseServings: 4,
    ingredients: [
      { id: 'chicken', name: 'Boneless chicken breasts', amount: 1.5, unit: 'lb', shape: 'protein', color: '#e6a06d' },
      { id: 'lemon', name: 'Lemons', amount: 2, unit: '', shape: 'lemon', color: '#e9c83e' },
      { id: 'garlic', name: 'Garlic', amount: 3, unit: 'clove', shape: 'garlic', color: '#efe2c8' },
      { id: 'thyme', name: 'Fresh thyme', amount: 6, unit: 'sprig', shape: 'herb', color: '#587a41' },
      { id: 'olive-oil', name: 'Olive oil', amount: 3, unit: 'tbsp', shape: 'bottle', color: '#a9a332' },
      { id: 'asparagus', name: 'Asparagus', amount: 1, unit: 'bunch', shape: 'long', color: '#698d49' },
      { id: 'salt', name: 'Kosher salt', amount: 0.75, unit: 'tsp', shape: 'seasoning', color: '#f4eee0' },
      { id: 'pepper', name: 'Black pepper', amount: 0.5, unit: 'tsp', shape: 'seasoning', color: '#41382f' }
    ],
    steps: [
      {
        title: 'Heat the oven and dry the chicken',
        body: 'Heat the oven to 425°F. Pat the chicken breasts very dry with paper towels, then season both sides generously with the salt and pepper.'
      },
      {
        title: 'Build the lemon-herb oil',
        body: 'Zest one lemon into a small bowl. Stir in the olive oil, two minced garlic cloves, and the leaves from four thyme sprigs. Rub half of this mixture over the chicken.'
      },
      {
        title: 'Sear until deeply golden',
        body: 'Heat a large oven-safe skillet over medium-high heat. Add the chicken and cook for 3 minutes per side, until the surface is golden. It does not need to be cooked through yet.'
      },
      {
        title: 'Add the asparagus',
        body: 'Toss the asparagus with the remaining lemon-herb oil. Tuck it around the chicken, add the remaining garlic, and roast for 12 to 15 minutes, until the chicken reaches 165°F.'
      },
      {
        title: 'Rest, brighten, and serve',
        body: 'Move the chicken to a cutting board for 5 minutes. Squeeze the second lemon over the pan and scrape up the browned bits. Serve with the asparagus, pan jus, and remaining thyme.'
      }
    ],
    tip: 'Let the pan get properly hot before adding the chicken. That golden crust is where the sauce gets its flavor.'
  },
  {
    id: 'miso-butter-mushrooms',
    title: 'Miso-Butter Mushrooms',
    kicker: 'on nutty sesame soba',
    description:
      'Meaty mushrooms glossed in savory miso butter, tangled with soba and scallions. A cozy bowl that comes together faster than takeout.',
    category: 'Noodles',
    accent: '#a66b3f',
    vegetarian: true,
    prep: 10,
    cook: 20,
    baseServings: 4,
    ingredients: [
      { id: 'mushrooms', name: 'Mixed mushrooms', amount: 1.25, unit: 'lb', shape: 'mushroom', color: '#9c704c' },
      { id: 'soba', name: 'Soba noodles', amount: 8, unit: 'oz', shape: 'noodles', color: '#b49a72' },
      { id: 'miso', name: 'White miso', amount: 2, unit: 'tbsp', shape: 'jar', color: '#c38b51' },
      { id: 'butter', name: 'Unsalted butter', amount: 3, unit: 'tbsp', shape: 'butter', color: '#f2d36e' },
      { id: 'garlic', name: 'Garlic', amount: 2, unit: 'clove', shape: 'garlic', color: '#efe2c8' },
      { id: 'scallions', name: 'Scallions', amount: 4, unit: 'stalk', shape: 'scallion', color: '#55945d' },
      { id: 'soy', name: 'Soy sauce', amount: 1, unit: 'tbsp', shape: 'bottle', color: '#523727' },
      { id: 'sesame', name: 'Sesame seeds', amount: 1, unit: 'tbsp', shape: 'seed', color: '#dbc79f' }
    ],
    steps: [
      {
        title: 'Boil the water',
        body: 'Bring a large pot of water to a boil. While it heats, tear or slice the mushrooms into bite-size pieces and thinly slice the scallions, keeping the green tops separate.'
      },
      {
        title: 'Brown the mushrooms',
        body: 'Melt 1 tablespoon of butter in a wide skillet over medium-high heat. Add the mushrooms in a single layer and cook without stirring for 4 minutes, then stir and cook 3 minutes more.'
      },
      {
        title: 'Make the glossy miso butter',
        body: 'Lower the heat to medium. Add the remaining butter, garlic, and white parts of the scallions. Cook for 1 minute, then whisk in the miso, soy sauce, and ¼ cup of hot water.'
      },
      {
        title: 'Cook and toss the soba',
        body: 'Boil the soba according to the package directions, usually 3 to 4 minutes. Drain and rinse briefly, then add the noodles directly to the mushroom skillet and toss until glossy.'
      },
      {
        title: 'Finish with crunch',
        body: 'Divide between warm bowls. Scatter with the reserved scallion greens and toasted sesame seeds. Taste and add a splash of soy sauce if the mushrooms need it.'
      }
    ],
    tip: 'A hot, wide pan is the secret to browned mushrooms. If yours looks crowded, cook them in two batches.'
  },
  {
    id: 'tomato-basil-pasta',
    title: 'Tomato-Basil Pasta',
    kicker: 'with burst cherry tomatoes',
    description:
      'Sweet tomatoes collapse into a silky pan sauce while the pasta cooks. Basil and a little vegetarian hard cheese make it taste like summer, any night.',
    category: 'Pasta',
    accent: '#c95b3e',
    vegetarian: true,
    prep: 10,
    cook: 20,
    baseServings: 4,
    ingredients: [
      { id: 'spaghetti', name: 'Spaghetti', amount: 12, unit: 'oz', shape: 'noodles', color: '#d2b57c' },
      { id: 'tomatoes', name: 'Cherry tomatoes', amount: 2, unit: 'cup', shape: 'tomato', color: '#d9563e' },
      { id: 'garlic', name: 'Garlic', amount: 3, unit: 'clove', shape: 'garlic', color: '#efe2c8' },
      { id: 'basil', name: 'Fresh basil', amount: 1, unit: 'bunch', shape: 'herb', color: '#447a4e' },
      { id: 'olive-oil', name: 'Olive oil', amount: 3, unit: 'tbsp', shape: 'bottle', color: '#a9a332' },
      { id: 'cheese', name: 'Vegetarian hard cheese', amount: 0.75, unit: 'cup', shape: 'cheese', color: '#e9d58e' },
      { id: 'chili', name: 'Red pepper flakes', amount: 0.5, unit: 'tsp', shape: 'seasoning', color: '#b44832' },
      { id: 'salt', name: 'Kosher salt', amount: 1, unit: 'tsp', shape: 'seasoning', color: '#f4eee0' }
    ],
    steps: [
      {
        title: 'Get the pasta water going',
        body: 'Bring a large pot of well-salted water to a boil. Add the spaghetti and cook until just shy of al dente, about 1 minute less than the package directions.'
      },
      {
        title: 'Bloom the garlic',
        body: 'While the pasta cooks, warm the olive oil in a large skillet over medium heat. Add the sliced garlic and red pepper flakes and cook for 30 seconds, until fragrant but not browned.'
      },
      {
        title: 'Burst the tomatoes',
        body: 'Add the cherry tomatoes and a pinch of salt. Cook for 6 to 8 minutes, pressing some tomatoes with the back of a spoon, until they soften and release their juices.'
      },
      {
        title: 'Bring it together',
        body: 'Reserve 1 cup pasta water, then drain the spaghetti. Add it to the skillet with ½ cup pasta water and half the cheese. Toss vigorously, adding more water as needed, until the sauce clings.'
      },
      {
        title: 'Finish with basil',
        body: 'Tear in most of the basil and toss once more. Serve immediately with the remaining cheese, basil, and a final pinch of red pepper flakes.'
      }
    ],
    tip: 'Keep tossing after the pasta leaves the pot. The starch in the water is what turns tomatoes and oil into a glossy sauce.'
  },
  {
    id: 'sheet-pan-salmon-broccoli',
    title: 'Sheet-Pan Salmon',
    kicker: 'with broccoli & lemony potatoes',
    description:
      'A weeknight traybake with crisp-edged potatoes, tender broccoli, and salmon that stays beautifully moist. The lemon-dill butter does the heavy lifting.',
    category: 'Sheet pan',
    accent: '#cf6c4e',
    vegetarian: false,
    prep: 12,
    cook: 18,
    baseServings: 4,
    ingredients: [
      { id: 'salmon', name: 'Salmon fillets', amount: 4, unit: '', shape: 'protein', color: '#df7858' },
      { id: 'broccoli', name: 'Broccoli', amount: 1.25, unit: 'lb', shape: 'broccoli', color: '#4f7e43' },
      { id: 'potatoes', name: 'Baby potatoes', amount: 1.5, unit: 'lb', shape: 'potato', color: '#c39b64' },
      { id: 'lemon', name: 'Lemon', amount: 1, unit: '', shape: 'lemon', color: '#e9c83e' },
      { id: 'olive-oil', name: 'Olive oil', amount: 3, unit: 'tbsp', shape: 'bottle', color: '#a9a332' },
      { id: 'garlic', name: 'Garlic', amount: 2, unit: 'clove', shape: 'garlic', color: '#efe2c8' },
      { id: 'dill', name: 'Fresh dill', amount: 4, unit: 'sprig', shape: 'herb', color: '#5e8d56' },
      { id: 'salt', name: 'Kosher salt', amount: 0.75, unit: 'tsp', shape: 'seasoning', color: '#f4eee0' }
    ],
    steps: [
      {
        title: 'Heat the oven and cut the potatoes',
        body: 'Heat the oven to 425°F. Halve the baby potatoes and toss them on a large sheet pan with 2 tablespoons olive oil and half the salt. Roast cut-side down for 12 minutes.'
      },
      {
        title: 'Season the salmon',
        body: 'Pat the salmon dry and season with the remaining salt. Mix the remaining olive oil with the minced garlic, lemon zest, and chopped dill.'
      },
      {
        title: 'Add the broccoli',
        body: 'Toss the broccoli florets with a little of the lemon-dill oil. Push the potatoes to one side, nestle the broccoli and salmon onto the pan, and brush the salmon with the rest of the oil.'
      },
      {
        title: 'Roast until just cooked',
        body: 'Roast for 10 to 12 minutes, until the salmon flakes easily and the broccoli is crisp-tender. If the potatoes need more color, give them a head start next time.'
      },
      {
        title: 'Squeeze and serve',
        body: 'Squeeze fresh lemon over the whole pan. Serve the salmon with the broccoli and potatoes, spooning any lemony pan juices over the top.'
      }
    ],
    tip: 'Salmon continues cooking after it leaves the oven. Pull it when the center is still a shade translucent.'
  },
  {
    id: 'chickpea-coconut-curry',
    title: 'Chickpea Coconut Curry',
    kicker: 'with spinach & jasmine rice',
    description:
      'A pantry-friendly curry with creamy coconut, warm spices, and plenty of spinach. It is weeknight-fast, freezer-friendly, and made for leftovers.',
    category: 'Plant-based',
    accent: '#d2a331',
    vegetarian: true,
    prep: 15,
    cook: 25,
    baseServings: 4,
    ingredients: [
      { id: 'chickpeas', name: 'Canned chickpeas', amount: 2, unit: 'can', shape: 'can', color: '#c9a268' },
      { id: 'coconut', name: 'Coconut milk', amount: 1, unit: 'can', shape: 'can', color: '#e8dfcc' },
      { id: 'tomatoes', name: 'Crushed tomatoes', amount: 1.5, unit: 'cup', shape: 'jar', color: '#c9573f' },
      { id: 'onion', name: 'Yellow onion', amount: 1, unit: '', shape: 'onion', color: '#cda452' },
      { id: 'ginger', name: 'Fresh ginger', amount: 1, unit: 'tbsp', shape: 'ginger', color: '#c9a068' },
      { id: 'curry', name: 'Curry powder', amount: 2, unit: 'tbsp', shape: 'seasoning', color: '#d59a29' },
      { id: 'spinach', name: 'Baby spinach', amount: 4, unit: 'cup', shape: 'spinach', color: '#487d43' },
      { id: 'rice', name: 'Jasmine rice', amount: 1.25, unit: 'cup', shape: 'rice', color: '#e7ddc5' },
      { id: 'lime', name: 'Lime', amount: 1, unit: '', shape: 'lime', color: '#83a73f' }
    ],
    steps: [
      {
        title: 'Start the rice',
        body: 'Rinse the rice until the water runs clear. Combine it with 2 cups water and a pinch of salt in a small pot. Bring to a boil, cover, and cook on low for 15 minutes. Rest off the heat.'
      },
      {
        title: 'Soften the onion',
        body: 'Warm a large shallow pot over medium heat with a little neutral oil. Add the diced onion and cook for 5 minutes, until soft and translucent. Stir in the ginger and curry powder and cook 30 seconds.'
      },
      {
        title: 'Build the curry',
        body: 'Add the crushed tomatoes and coconut milk. Stir well, scraping up anything stuck to the bottom, then add the drained chickpeas and ½ cup water. Simmer gently for 12 minutes.'
      },
      {
        title: 'Wilt the spinach',
        body: 'Fold the spinach into the curry in handfuls. Cook for 2 minutes, just until wilted. Taste and add salt and a squeeze of lime.'
      },
      {
        title: 'Serve over rice',
        body: 'Fluff the rice with a fork. Spoon the curry into bowls and serve with the rice, lime wedges, and extra curry powder if you like a little more heat.'
      }
    ],
    tip: 'No coconut milk? Stir ½ cup plain yogurt into the curry at the very end, off the heat, for a similar creamy finish.'
  },
  {
    id: 'ginger-beef-rice',
    title: 'Ginger Beef & Rice',
    kicker: 'with sesame bok choy',
    description:
      'A fast, savory stir-fry with crisp bok choy and a ginger-soy glaze. Everything cooks in the time it takes the rice to finish.',
    category: 'Stir-fry',
    accent: '#b5503b',
    vegetarian: false,
    prep: 20,
    cook: 15,
    baseServings: 4,
    ingredients: [
      { id: 'beef', name: 'Flank steak', amount: 1, unit: 'lb', shape: 'protein', color: '#9d523f' },
      { id: 'rice', name: 'Jasmine rice', amount: 1.5, unit: 'cup', shape: 'rice', color: '#e7ddc5' },
      { id: 'ginger', name: 'Fresh ginger', amount: 2, unit: 'tbsp', shape: 'ginger', color: '#c9a068' },
      { id: 'soy', name: 'Low-sodium soy sauce', amount: 0.25, unit: 'cup', shape: 'bottle', color: '#523727' },
      { id: 'sesame-oil', name: 'Toasted sesame oil', amount: 1, unit: 'tbsp', shape: 'bottle', color: '#9c6d2f' },
      { id: 'bok-choy', name: 'Baby bok choy', amount: 4, unit: '', shape: 'bokchoy', color: '#4f8345' },
      { id: 'garlic', name: 'Garlic', amount: 2, unit: 'clove', shape: 'garlic', color: '#efe2c8' },
      { id: 'scallions', name: 'Scallions', amount: 3, unit: 'stalk', shape: 'scallion', color: '#55945d' }
    ],
    steps: [
      {
        title: 'Cook the rice',
        body: 'Rinse the rice, then cook it with 2¼ cups water and a pinch of salt according to your usual method. Keep covered and warm while you make the beef.'
      },
      {
        title: 'Slice and marinate',
        body: 'Slice the flank steak thinly against the grain. Toss it with half the soy sauce, half the ginger, and 1 teaspoon sesame oil. Let it sit while you prep the vegetables.'
      },
      {
        title: 'Sear the beef',
        body: 'Heat a large wok or skillet over high heat until very hot. Add a little neutral oil, then the beef in a single layer. Sear for 1 to 2 minutes, stirring only once, and transfer to a plate.'
      },
      {
        title: 'Stir-fry the bok choy',
        body: 'Add the halved bok choy to the hot pan, cut-side down. Cook for 2 minutes, then add the garlic, remaining ginger, and scallion whites. Stir-fry for 1 minute.'
      },
      {
        title: 'Glaze and serve',
        body: 'Return the beef and any juices to the pan. Add the remaining soy sauce and sesame oil. Toss for 30 seconds, then serve over rice with the scallion greens.'
      }
    ],
    tip: 'Freeze the steak for 15 minutes before slicing. A firm piece is much easier to cut into thin, tender strips.'
  },
  {
    id: 'corn-zucchini-tacos',
    title: 'Corn & Zucchini Tacos',
    kicker: 'with black beans & lime crema',
    description:
      'Charred corn, golden zucchini, and creamy black beans tucked into warm tortillas. Quick, colorful, and just smoky enough to feel like a treat.',
    category: 'Tacos',
    accent: '#d6a12c',
    vegetarian: true,
    prep: 15,
    cook: 15,
    baseServings: 4,
    ingredients: [
      { id: 'tortillas', name: 'Corn tortillas', amount: 8, unit: '', shape: 'tortilla', color: '#e3bd78' },
      { id: 'corn', name: 'Corn', amount: 3, unit: 'ear', shape: 'corn', color: '#e5bc39' },
      { id: 'beans', name: 'Black beans', amount: 1, unit: 'can', shape: 'beans', color: '#473f3b' },
      { id: 'zucchini', name: 'Zucchini', amount: 2, unit: '', shape: 'zucchini', color: '#5f8a43' },
      { id: 'lime', name: 'Limes', amount: 2, unit: '', shape: 'lime', color: '#83a73f' },
      { id: 'feta', name: 'Feta', amount: 0.5, unit: 'cup', shape: 'feta', color: '#eee6ce' },
      { id: 'cilantro', name: 'Cilantro', amount: 1, unit: 'bunch', shape: 'herb', color: '#4c864d' },
      { id: 'paprika', name: 'Smoked paprika', amount: 1.5, unit: 'tsp', shape: 'seasoning', color: '#b64c34' },
      { id: 'olive-oil', name: 'Olive oil', amount: 2, unit: 'tbsp', shape: 'bottle', color: '#a9a332' }
    ],
    steps: [
      {
        title: 'Char the corn',
        body: 'Cut the kernels from the corn cobs. Heat a large skillet over high heat with 1 tablespoon olive oil. Add the corn and cook for 3 to 4 minutes, until some kernels are deeply golden.'
      },
      {
        title: 'Brown the zucchini',
        body: 'Push the corn to one side and add the remaining oil and diced zucchini. Season with the smoked paprika and cook for 4 minutes, stirring occasionally, until the zucchini is golden and tender.'
      },
      {
        title: 'Warm the beans and tortillas',
        body: 'Drain and rinse the black beans. Add them to the skillet with a splash of water and cook for 2 minutes. Warm the tortillas in a dry pan or directly over a low flame.'
      },
      {
        title: 'Make a quick lime crema',
        body: 'Zest one lime and juice both. Stir the lime juice and zest into the feta with 2 tablespoons water, mashing until it becomes a loose, spoonable crema. Add a pinch of salt.'
      },
      {
        title: 'Fill and finish',
        body: 'Spoon the corn, zucchini, and beans into the warm tortillas. Drizzle with lime crema and scatter with cilantro. Serve with any extra lime wedges.'
      }
    ],
    tip: 'Keep the tortillas covered in a clean towel as they warm. The steam makes them soft and flexible.'
  },
  {
    id: 'sunday-chicken-soup',
    title: 'Sunday Chicken Soup',
    kicker: 'with egg noodles & plenty of lemon',
    description:
      'A from-scratch chicken soup that tastes slow-cooked but is ready in under an hour. Big pieces of carrot, tender chicken, and a bright lemon finish.',
    category: 'Soup',
    accent: '#cf9a31',
    vegetarian: false,
    prep: 20,
    cook: 35,
    baseServings: 6,
    ingredients: [
      { id: 'chicken', name: 'Boneless chicken thighs', amount: 1.5, unit: 'lb', shape: 'protein', color: '#e6a06d' },
      { id: 'carrots', name: 'Carrots', amount: 4, unit: '', shape: 'carrot', color: '#df8334' },
      { id: 'celery', name: 'Celery stalks', amount: 3, unit: 'stalk', shape: 'long', color: '#719659' },
      { id: 'onion', name: 'Yellow onion', amount: 1, unit: '', shape: 'onion', color: '#cda452' },
      { id: 'noodles', name: 'Egg noodles', amount: 3, unit: 'cup', shape: 'noodles', color: '#d5b97d' },
      { id: 'broth', name: 'Chicken broth', amount: 8, unit: 'cup', shape: 'carton', color: '#d5b46e' },
      { id: 'parsley', name: 'Fresh parsley', amount: 1, unit: 'bunch', shape: 'herb', color: '#5d8b4d' },
      { id: 'lemon', name: 'Lemon', amount: 1, unit: '', shape: 'lemon', color: '#e9c83e' },
      { id: 'salt', name: 'Kosher salt', amount: 1.5, unit: 'tsp', shape: 'seasoning', color: '#f4eee0' },
      { id: 'pepper', name: 'Black pepper', amount: 0.5, unit: 'tsp', shape: 'seasoning', color: '#41382f' }
    ],
    steps: [
      {
        title: 'Sweat the aromatics',
        body: 'Heat a large Dutch oven over medium heat with a little olive oil. Add the diced onion, carrots, and celery. Cook for 7 minutes, stirring occasionally, until the onion is soft and the vegetables smell sweet.'
      },
      {
        title: 'Season and add broth',
        body: 'Season the vegetables with the salt and pepper. Pour in the chicken broth and 2 cups water. Bring to a gentle simmer and scrape up any browned bits from the bottom.'
      },
      {
        title: 'Poach the chicken',
        body: 'Nestle the chicken thighs into the broth. Simmer gently for 15 minutes, until the chicken is cooked through. Transfer the chicken to a plate and shred it with two forks when cool enough to handle.'
      },
      {
        title: 'Cook the noodles',
        body: 'Add the egg noodles to the simmering broth. Cook according to the package directions, usually 6 to 8 minutes, until tender but not mushy.'
      },
      {
        title: 'Return the chicken',
        body: 'Stir the shredded chicken back into the pot. Add the chopped parsley, a squeeze of lemon, and a little more salt if needed. Simmer for 2 minutes to bring everything together.'
      },
      {
        title: 'Serve with lemon',
        body: 'Ladle into deep bowls and finish with black pepper, parsley, and thin lemon slices. The soup thickens as it sits; loosen leftovers with a splash of broth or water.'
      }
    ],
    tip: 'For a clearer broth, keep the pot at a gentle simmer rather than a rolling boil.'
  }
];

export const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

