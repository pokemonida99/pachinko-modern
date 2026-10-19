#!/usr/bin/env python3
"""產生所有新影片的 H3 Ref2VA 提示詞與送單清單。
執行：python3 production/make_prompts.py → production/prompts/*.txt、production/jobs.tsv
jobs.tsv 欄位：批次、檔名、秒數、參考圖1、參考圖2（沒有就空白）
參考圖 gpt:xxx 代表要先用 GPT 生成 production/refs/xxx.png（提示詞在 refs_gpt.tsv）。
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))

STYLE = ("The target video is a high-quality 3D CG animation in the glossy style of modern Pokémon game cinematics: "
         "soft global illumination, vivid saturated colors, smooth subsurface shading, shallow depth of field, 16:9. "
         "Framing: medium shots and medium close-ups where the whole Pokémon, including the top of its head, ears or bulb, stays inside the frame and fills about half to two thirds of the frame height; face close-ups only where a shot says so; never a wide shot, never a tiny distant figure. "
         "Every Pokémon keeps its exact official body shape, colors and markings and keeps facing the camera or in clean profile; nobody turns around or twists its head backward. "
         "Expressions are cute, friendly and natural with soft smiling eyes unless a shot says otherwise, never angry-looking or creepy. No humans, no human hands, no trainers, no text, no letters, no logos, no UI elements on screen. "
         "The white background of the reference pictures is not used.")

# (批次, 檔名, 秒數, [(參考圖, 角色描述)], 摘要, [鏡頭], 音效, 音樂)
J = []
def job(batch, name, sec, subs, summary, shots, sfx, music='No music.'):
    J.append((batch, name, sec, subs, summary, shots, sfx, music))

P = lambda k: f's{k}.png'
BULBA = (P(1), 'Bulbasaur, the Pokémon shown in <Picture {n}>: teal-green body with darker spots, green bulb on its back, red eyes')
CHAR = (P(2), 'Charmander, the Pokémon shown in <Picture {n}>: orange lizard body, cream belly, flame burning on its tail tip')
SQUIR = (P(3), 'Squirtle, the Pokémon shown in <Picture {n}>: light-blue turtle with a brown shell and curled tail')
PIKA = (P(4), 'Pikachu, the Pokémon shown in <Picture {n}>: yellow mouse with red cheeks, black-tipped ears and a lightning-bolt tail')
EEVEE = (P(5), 'Eevee, the Pokémon shown in <Picture {n}>: brown fox-like body, big ears, fluffy cream collar and bushy tail')
SNOR = (P(6), 'Snorlax, the Pokémon shown in <Picture {n}>: huge dark-teal body with a big cream belly, sleepy face')
MEOW = (P(7), 'Meowth, the Pokémon shown in <Picture {n}>: cream cat standing upright, gold coin charm on its forehead, curled tail')
GENG = (P(8), 'Gengar, the Pokémon shown in <Picture {n}>: round purple ghost with spiky back, red eyes and a wide grin')
MEWT = (P(9), 'Mewtwo, the Pokémon shown in <Picture {n}>: tall pale-lavender psychic Pokémon with a purple tail and calm purple eyes')
CHARIZ = ('charizard.png', 'Charizard, the Pokémon shown in <Picture {n}>: big orange dragon with teal inner wings and a flaming tail')
def G(key, desc):
    # GPT's image tool refuses Pokémon names, so these have no reference picture: H3 draws them from its own knowledge
    return (None, desc.replace(', the Pokémon shown in <Picture {n}>', ', the Pokémon').replace(', the legendary bird shown in <Picture {n}>', ', the legendary bird'))

LOOP = 'The motion is gentle and continuous so the clip can loop as an idle background; the final frame returns close to the opening composition.'

# ---------- 第一批：待機 ----------
job(1, '15_idle_bulbasaur', 8, [BULBA], 'Bulbasaur explores a sunlit forest',
    ['Medium close-up of <Subject 1> walking forward through a lush sunlit forest, pushing aside big broad leaves with its vines, curious happy face, camera tracking backward in front of it at its eye level, dust motes in god rays. ' + LOOP],
    'Soft forest ambience, rustling leaves, light footsteps, a small cute Bulbasaur call. No human voices.')
job(1, '16_idle_pikachu', 8, [PIKA], 'Pikachu runs across a meadow',
    ['Medium close-up tracking shot alongside <Subject 1> running happily on all fours across a bright green meadow with flowers, camera moving sideways at its speed so it stays centered in profile, little sparks from its cheeks, grass blurring past. ' + LOOP],
    'Wind, quick light footsteps, grass swish, tiny electric crackles. No human voices.')
job(1, '17_idle_charizard_day', 8, [CHARIZ], 'Charizard flies through a blue daytime sky',
    ['Medium close-up of <Subject 1> gliding through a bright blue daytime sky between fluffy white clouds, camera flying alongside it in profile, wings beating slowly, tail flame flickering, sunlight glinting. ' + LOOP],
    'Strong wind rush, slow heavy wing beats, flame crackle. No human voices.')
job(1, '18_idle_squirtle', 8, [SQUIR], 'Squirtle surfs on ocean waves',
    ['Medium close-up of <Subject 1> riding a curling turquoise ocean wave standing on its shell like a surfboard, arms out for balance, big happy grin, sparkling spray, camera gliding alongside on the water at its eye level. ' + LOOP],
    'Ocean waves, splashing water, sea breeze, a cheerful Squirtle call. No human voices.')
job(1, '19_idle_eevee', 8, [EEVEE], 'Eevee chases butterflies in a flower field',
    ['Medium close-up of <Subject 1> hopping playfully through a pastel flower field, chasing a few small white butterflies, ears bouncing, tail wagging, camera at its eye level drifting with it, soft afternoon light and floating petals. ' + LOOP],
    'Gentle breeze, soft hops, birdsong, a tiny happy Eevee call. No human voices.')
job(1, '20_idle_snorlax', 8, [SNOR], 'Snorlax naps under a big tree',
    ['Medium close-up of <Subject 1> sleeping on its back under the shade of a big tree, belly slowly rising and falling, a leaf drifting down and landing on its belly, dappled sunlight moving, camera slowly pushing in toward its peaceful face. ' + LOOP],
    'Slow deep snoring, rustling leaves, distant birds. No human voices.')

# ---------- 第一批：聽牌登場 ----------
REACH = 'Dramatic reach moment: the background darkens slightly and a ring of glowing light pulses around the Pokémon.'
def reach(name, sub, action, sfx):
    job(1, name, 5, [sub], 'a dramatic reach entrance close-up',
        [f'Face close-up of <Subject 1> on a dark glowing stage background, {action}, camera pushing in fast. {REACH}'], sfx)
reach('21_reach_bulbasaur', BULBA, 'two vines lash out from its bulb and crack in the air while its eyes narrow with determination', 'Whip crack, leafy whoosh, rising tension sting. No human voices.')
reach('22_reach_charmander', CHAR, 'the flame on its tail flares up into a big roaring fire that lights its determined face orange', 'Fire roar building up, rising tension sting. No human voices.')
reach('23_reach_squirtle', SQUIR, 'it puffs its cheeks and shoots a sparkling jet of water past the camera, then grins confidently', 'Water jet blast, splash, rising tension sting. No human voices.')
reach('24_reach_pikachu', PIKA, 'its red cheeks spark and crackle with bright yellow electricity that lights up its fierce eyes', 'Electric crackling building to a zap, rising tension sting. No human voices.')
reach('25_reach_eevee', EEVEE, 'its big ears shoot straight up, its fur ruffles in a sudden wind and its eyes sparkle with focus', 'Sudden wind gust, sparkle chime, rising tension sting. No human voices.')
reach('26_reach_snorlax', SNOR, 'its sleepy face slowly opens one eye with a gleam, then both eyes open wide', 'Big yawn, heavy rumble, rising tension sting. No human voices.')
reach('27_reach_meowth', MEOW, 'the gold coin on its forehead flashes brilliantly and it grins slyly with its claws out', 'Coin shine chime, sly snicker, rising tension sting. No human voices.')
reach('28_reach_gengar', GENG, 'it rises out of a pool of dark purple shadow with a wide grin and glowing red eyes', 'Ghostly whoosh, eerie chuckle, rising tension sting. No human voices.')
reach('29_reach_mewtwo', MEWT, 'its purple eyes glow with blue psychic light and a shimmering psychic aura flows around it', 'Deep psychic hum swelling, rising tension sting. No human voices.')

# ---------- 第一批：中獎（夥伴勝利） ----------
WIN_MUSIC = 'A short triumphant bright orchestral victory fanfare.'
def win(name, sub, opp, shots, sfx):
    subs = [sub, opp] if opp else [sub]
    job(1, name, 6, subs, 'a battle-winning finisher and victory pose', shots, sfx, WIN_MUSIC)
win('30_win_bulbasaur', BULBA, SQUIR,
    ['Face close-up of <Subject 1>, determined, launching a storm of spinning glowing razor leaves from its bulb toward the camera.',
     'At 00:02, the shot cuts to: medium close-up of <Subject 2> hit by the swirling leaves, tumbling backward dizzy with swirly eyes.',
     'At 00:04, the shot cuts to: medium close-up of <Subject 1> doing a proud happy victory pose as leaves flutter down in golden light.'],
    'Whooshing razor leaves, impact hits, splashy yelp, victory sparkle. No human voices.')
win('31_win_charmander', CHAR, BULBA,
    ['Face close-up of <Subject 1> taking a deep breath, then blasting a huge roaring stream of flamethrower fire toward the camera.',
     'At 00:02, the shot cuts to: medium close-up of <Subject 2> engulfed in a harmless cartoon puff of fire and smoke, its bulb smoking, falling over dizzy with swirly eyes.',
     'At 00:04, the shot cuts to: medium close-up of <Subject 1> cheering with arms up, its tail flame blazing bright.'],
    'Flamethrower roar, puff of smoke, comic thud, victory sparkle. No human voices.')
win('32_win_squirtle', SQUIR, CHAR,
    ['Face close-up of <Subject 1> leaning forward and firing a powerful glittering water gun blast toward the camera.',
     'At 00:02, the shot cuts to: medium close-up of <Subject 2> drenched by the water blast, its tail flame sputtering, sitting down dizzy.',
     'At 00:04, the shot cuts to: medium close-up of <Subject 1> giving a cool confident victory pose, water droplets sparkling around it.'],
    'Water cannon blast, big splash, fire sizzle, victory sparkle. No human voices.')
win('33_win_pikachu', PIKA, MEOW,
    ['Face close-up of <Subject 1> crouching with cheeks crackling, then unleashing a blinding Thunderbolt of zigzag lightning upward.',
     'At 00:02, the shot cuts to: medium close-up of <Subject 2> struck by the lightning, fur standing on end and sparking, falling over dizzy.',
     'At 00:04, the shot cuts to: medium close-up of <Subject 1> doing a cheerful victory pose with a little hop, sparks fading.'],
    'Electric charge-up, thunder crack, comic yelp, victory sparkle. No human voices.')
win('34_win_eevee', EEVEE, GENG,
    ['Face close-up of <Subject 1> narrowing its eyes, then dashing forward fast toward the camera in a glowing white Swift attack with golden stars.',
     'At 00:02, the shot cuts to: medium close-up of <Subject 2> hit by the shining stars, its grin turning into a dizzy face as it sinks down into its shadow.',
     'At 00:04, the shot cuts to: medium close-up of <Subject 1> spinning around once happily in place, then sitting proudly with sparkles.'],
    'Fast whoosh, star sparkles hitting, ghostly groan fading, victory sparkle. No human voices.')

# ---------- 第一批：中獎（野生收服） ----------
def capture(name, sub, ball, place, shake, sfx):
    job(1, name, 6, [sub], f'a Pokémon capture with a {ball}', [
        f'Face close-up of <Subject 1> {place}, then a {ball} flies in from the side, pops open and a beam of red light pulls <Subject 1> inside.',
        f'At 00:02, the shot cuts to: close-up of the closed {ball} sitting on the ground, the center button glowing as it {shake} shakes one, two, three times, tension building.',
        f'At 00:04, the shot cuts to: close-up of the {ball} clicking shut, the button light turns off and a burst of golden stars explodes around it.'],
        sfx, WIN_MUSIC)
capture('35_cap_snorlax', SNOR, 'red-and-white Poké Ball', 'sleeping on a grassy hill', 'wobbles heavily side to side as it', 'Ball throw whoosh, beam zap, three wobble clicks, final click, star burst chime. No human voices.')
capture('36_cap_meowth', MEOW, 'blue Great Ball with red stripes', 'grinning in a moonlit alley', 'rocks side to side as it', 'Ball throw whoosh, beam zap, three wobble clicks, final click, star burst chime. No human voices.')
capture('37_cap_gengar', GENG, 'red-and-white Poké Ball', 'laughing in a dark purple haunted hall', 'trembles inside a swirling shadow as it', 'Ball throw whoosh, beam zap, three eerie wobble clicks, final click, star burst chime. No human voices.')
capture('38_cap_mewtwo', MEWT, 'purple Master Ball with two pink bumps on top', 'floating in a crystal cave with a psychic aura', 'glows violet and a tall purple light pillar rises as it', 'Ball throw whoosh, deep beam zap, three heavy wobble clicks, final click, huge star burst and choir hit. No human voices.')

# ---------- 第一批：失敗 ----------
job(1, '39_lose_partner', 5, [PIKA, MEOW], 'the opponent dodges and the partner gets dizzy', [
    'Medium close-up of <Subject 1> lunging forward with crackling electricity.',
    'At 00:02, the shot cuts to: medium close-up of <Subject 2> dodging aside smugly at the last moment.',
    'At 00:03, the shot cuts to: face close-up of <Subject 1> sitting down dizzy with swirly eyes and little stars circling its head, a small comic sweat drop.'],
    'Whoosh, miss, comic wobble sound, sad trombone wah-wah. No human voices.', 'No music.')
job(1, '40_lose_wild', 5, [SNOR], 'the Poké Ball breaks open and the Pokémon escapes', [
    'Close-up of a red-and-white Poké Ball on the grass wobbling once, twice.',
    'At 00:02, the shot cuts to: the ball bursts open in a flash of red light and <Subject 1> pops back out.',
    'At 00:03, the shot cuts to: medium close-up of <Subject 1> yawning, rolling over and lumbering away out of frame.'],
    'Two wobble clicks, pop burst, big yawn, heavy footsteps, sad trombone wah-wah. No human voices.', 'No music.')

# ---------- 第二批：SP／SPSP ----------
DRAGONITE = G('dragonite', 'Dragonite, the Pokémon shown in <Picture {n}>: friendly orange dragon with small teal wings, cream belly and antennae')
MOLTRES = G('moltres', 'Moltres, the legendary bird shown in <Picture {n}>: large golden-orange bird with wings made of fire')
ARTICUNO = G('articuno', 'Articuno, the legendary bird shown in <Picture {n}>: elegant icy-blue bird with long flowing tail feathers')
ZAPDOS = G('zapdos', 'Zapdos, the legendary bird shown in <Picture {n}>: spiky yellow-and-black electric bird')
for n, tag, sec, summ, shots, sfx, music in [
    (41, 'meowth_reach', 10, 'Meowth steals a Poké Ball and Pikachu chases it', [
        'Face close-up of <Subject 2> snatching a shiny Poké Ball with a sly grin in a sunny town street.',
        'At 00:03, the shot cuts to: medium close-up tracking shot of <Subject 2> running away on two legs hugging the ball, looking forward.',
        'At 00:06, the shot cuts to: face close-up of <Subject 1> running fast after it with sparks flying from its cheeks, determined.'],
        'Quick footsteps, sly snicker, electric crackles, chase tension rising. No human voices.', 'Fast comical chase music with tension.'),
    (42, 'meowth_win', 6, 'Pikachu zaps Meowth and gets the ball back', [
        'Face close-up of <Subject 1> leaping and firing a bright Thunderbolt.',
        'At 00:02, the shot cuts to: medium close-up of <Subject 2> zapped, fur standing on end, dropping the Poké Ball.',
        'At 00:04, the shot cuts to: close-up of <Subject 1> holding the Poké Ball up happily in its paws with sparkles.'],
        'Thunder crack, comic yelp, ball bounce, victory sparkle. No human voices.', WIN_MUSIC),
    (43, 'meowth_lose', 5, 'Meowth escapes with the ball', [
        'Medium close-up of <Subject 2> jumping over a wall with the Poké Ball, waving a paw cheekily.',
        'At 00:02, the shot cuts to: face close-up of <Subject 1> panting and drooping its ears in disappointment.'],
        'Jump whoosh, cheeky laugh, sad trombone. No human voices.', 'No music.')]:
    job(2, f'{n}_sp_{tag}', sec, [PIKA, MEOW], summ, shots, sfx, music)
for n, tag, sec, summ, shots, sfx, music in [
    (44, 'dragonite_reach', 10, 'Pikachu faces Dragonite in a sky battle', [
        'Face close-up of <Subject 1> standing on a cliff top above the clouds, wind in its fur, eyes fierce.',
        'At 00:03, the shot cuts to: medium close-up of <Subject 2> rising up from the clouds, spreading its wings and roaring.',
        'At 00:06, the shot cuts to: face close-up of <Subject 2> charging a swirling orange dragon energy ball in its mouth, aimed at the camera.'],
        'Howling wind, mighty roar, energy charging, tension rising. No human voices.', 'Epic battle music building tension.'),
    (45, 'dragonite_win', 6, 'Pikachu defeats Dragonite with a giant thunderbolt', [
        'Face close-up of <Subject 1> leaping into the sky surrounded by a huge sphere of lightning.',
        'At 00:02, the shot cuts to: medium close-up of <Subject 2> struck by a massive lightning bolt, sparks everywhere, sinking down into the clouds dizzy.',
        'At 00:04, the shot cuts to: medium close-up of <Subject 1> landing on the cliff in a victory pose as the clouds part into golden light.'],
        'Giant thunder crack, roar fading, triumphant sparkle. No human voices.', WIN_MUSIC),
    (46, 'dragonite_lose', 5, 'Dragonite blows Pikachu away', [
        'Medium close-up of <Subject 2> flapping its wings hard, creating a huge gust of wind.',
        'At 00:02, the shot cuts to: face close-up of <Subject 1> tumbling in the wind with swirly dizzy eyes.'],
        'Huge gust of wind, comic tumble, sad trombone. No human voices.', 'No music.')]:
    job(2, f'{n}_sp_{tag}', sec, [PIKA, DRAGONITE], summ, shots, sfx, music)
for n, tag, sec, summ, subs, shots, sfx, music in [
    (47, 'birds_reach', 12, 'the three legendary birds appear in a thunderstorm', [PIKA, MOLTRES, ARTICUNO], [
        'Face close-up of <Subject 1> on a rocky peak in a dark thunderstorm, looking up in awe, rain falling, lightning flashes.',
        'At 00:03, the shot cuts to: medium close-up of <Subject 2> bursting out of the storm clouds, wings of fire blazing.',
        'At 00:06, the shot cuts to: medium close-up of <Subject 3> sweeping past with glittering ice crystals trailing from its tail.',
        'At 00:09, the shot cuts to: face close-up of <Subject 1> sparking with full power, ready to battle, a Poké Ball glowing beside it.'],
        'Thunderstorm, fire roar, icy chime, electric crackle, epic tension rising. No human voices.', 'Epic legendary encounter music building to a climax.'),
    (48, 'birds_win', 6, 'the legendary bird is captured in a Poké Ball', [PIKA, MOLTRES], [
        'Face close-up of <Subject 1> firing a huge Thunderbolt upward into the storm.',
        'At 00:02, the shot cuts to: medium close-up of <Subject 2> drawn by red light into a Poké Ball in mid-air.',
        'At 00:04, the shot cuts to: close-up of the Poké Ball on the rock clicking shut, the storm clears and a rainbow and golden stars burst out.'],
        'Thunder crack, beam zap, wobble clicks, final click, huge star burst. No human voices.', WIN_MUSIC),
    (49, 'birds_lose', 5, 'the legendary birds fly away into the storm', [PIKA, MOLTRES], [
        'Medium close-up of <Subject 2> letting out a cry and soaring away into the storm clouds.',
        'At 00:02, the shot cuts to: face close-up of <Subject 1> in the rain, ears drooping, watching the sky sadly.'],
        'Bird cry fading, rain, thunder rumble, sad trombone. No human voices.', 'No music.')]:
    job(2, f'{n}_spsp_{tag}', sec, subs, summ, shots, sfx, music)

# ---------- 第三批：RUSH ----------
BLAST = G('blastoise', 'Blastoise, the Pokémon shown in <Picture {n}>: big blue turtle with a brown shell and two water cannons on its shoulders')
GYARA = G('gyarados', 'Gyarados, the Pokémon shown in <Picture {n}>: huge blue sea serpent with a fierce open mouth and whiskers')
for rival, ridx, rdesc, place in [('blastoise', 50, BLAST, 'a rocky seaside cliff at sunset'), ('gyarados', 53, GYARA, 'a stormy ocean at sunset')]:
    job(3, f'{ridx}_rush_{rival}_reach', 8, [CHARIZ, rdesc], f'Charizard faces {rival.capitalize()} during RUSH', [
        f'Face close-up of <Subject 1> hovering over {place}, roaring, tail flame blazing.',
        'At 00:03, the shot cuts to: medium close-up of <Subject 2> rising up and roaring back, water spraying.',
        'At 00:05, the shot cuts to: face close-up of <Subject 1> inhaling, fire gathering in its mouth, eyes locked on the opponent.'],
        'Roars, crashing water, fire building, fast tension rising. No human voices.', 'Fast intense battle music.')
    job(3, f'{ridx+1}_rush_{rival}_win', 6, [CHARIZ, rdesc], 'Charizard wins with a blast of fire', [
        'Face close-up of <Subject 1> unleashing a gigantic blast of fire.',
        'At 00:02, the shot cuts to: medium close-up of <Subject 2> hit by the blast in a burst of steam, sinking back down dizzy.',
        'At 00:04, the shot cuts to: medium close-up of <Subject 1> roaring triumphantly in the sky, fire swirling around it.'],
        'Fire blast, steam burst, triumphant roar, victory sparkle. No human voices.', WIN_MUSIC)
    job(3, f'{ridx+2}_rush_{rival}_lose', 5, [CHARIZ, rdesc], 'the rival blocks Charizard', [
        'Medium close-up of <Subject 2> firing a massive jet of water that puts out the fire blast.',
        'At 00:02, the shot cuts to: face close-up of <Subject 1> drenched and shaking off water, annoyed.'],
        'Water blast, sizzle, splash, sad trombone. No human voices.', 'No music.')
HOOH = G('hooh', 'Ho-Oh, the legendary bird shown in <Picture {n}>: majestic rainbow-golden phoenix with red and gold feathers')
job(3, '56_chain_ride', 6, [CHARIZ, PIKA], 'Pikachu rides Charizard in a fast dash', [
    'Medium close-up of <Subject 2> riding on the back of <Subject 1>, holding on happily as they dash through golden sunset clouds, camera flying alongside.',
    'At 00:03, the shot cuts to: face close-up of <Subject 1> roaring with joy, speed lines and sparks streaming past.'],
    'Rushing wind, roar, electric crackles, upbeat whoosh. No human voices.', 'Fast upbeat heroic music.')
job(3, '57_chain_mega', 6, [CHARIZ], 'Charizard glows with a mega evolution light', [
    'Face close-up of <Subject 1> in the sky, wrapped in a glowing rainbow energy cocoon, eyes shining.',
    'At 00:03, the shot cuts to: medium close-up of <Subject 1> bursting out of the light, now dark black with blue flames, roaring powerfully.'],
    'Energy surge, crystal chime, explosive roar, blue flames. No human voices.', 'Epic powerful music swell.')
job(3, '58_chain_hooh', 6, [PIKA, HOOH], 'Ho-Oh flies across a rainbow', [
    'Face close-up of <Subject 1> looking up in awe, eyes sparkling, rainbow light on its face.',
    'At 00:02, the shot cuts to: medium close-up of <Subject 2> flying across a huge rainbow at sunset, shimmering golden feathers trailing sparkles, crying out majestically as rainbow light bursts behind it.'],
    'Majestic bird cry, sparkling chimes, wind. No human voices.', 'Majestic triumphant orchestral music.')
job(3, '59_rush_end', 6, [CHARIZ], 'Charizard lands at sunset to end the RUSH', [
    'Medium close-up of <Subject 1> slowly descending onto a rocky hill at sunset, wings spreading wide.',
    'At 00:03, the shot cuts to: face close-up of <Subject 1> folding its wings, closing its eyes calmly, tail flame flickering softly in the evening wind.'],
    'Slow wing beats, soft landing thud, evening wind. No human voices.', 'Calm warm closing music.')

# ---------- 第四批：予告與其他 ----------
def cutin(n, color, sub, action, sfx):
    job(4, f'{n}_cutin_{color}', 5, [sub], f'a {color} cut-in', [
        f'Extreme face close-up of <Subject 1> against a solid glowing {color} energy background, {action}, the camera zooming in fast, speed lines radiating.'],
        sfx, 'A short sharp dramatic sting.')
cutin(60, 'blue', SQUIR, 'its eyes flashing and water splashing toward the camera', 'Splash, whoosh, sharp sting. No human voices.')
cutin(61, 'green', BULBA, 'its eyes flashing and leaves swirling toward the camera', 'Leaf whoosh, sharp sting. No human voices.')
cutin(62, 'gold', PIKA, 'its eyes flashing and golden lightning bursting toward the camera', 'Thunder burst, sharp sting. No human voices.')
CATER = G('caterpie', 'Caterpie, the Pokémon shown in <Picture {n}>: small green caterpillar with a red antenna and big eyes')
MAGI = G('magikarp', 'Magikarp, the Pokémon shown in <Picture {n}>: orange-red fish with big whiskers and a goofy face')
job(4, '63_group_caterpie', 5, [CATER], 'a crowd of Caterpie crawls by', [
    'Close-up at ground level of many <Subject 1> crawling across the frame in a cute line on a leafy branch, one stopping to look at the camera curiously.'],
    'Soft squishy crawling, cute chirps. No human voices.')
job(4, '64_group_magikarp', 5, [SQUIR, MAGI], 'a school of Magikarp jumps out of the water', [
    'Medium close-up of <Subject 1> swimming in a sparkling river, looking surprised as many <Subject 2> leap out of the water all around it at once, splashing toward the camera in a big wave.'],
    'Lots of splashing, flopping, comic boing. No human voices.', 'A short lively sting.')
SHINY = G('shiny_eevee', 'shiny Eevee, the Pokémon shown in <Picture {n}>: silver-white fur with a pale fluffy collar and blue eyes')
job(4, '65_premium_shiny', 5, [SHINY], 'a rare shiny Eevee sparkle', [
    'Face close-up of <Subject 1> blinking cutely as a burst of rainbow sparkles and stars swirls around it on a soft pastel glowing background.'],
    'Shiny sparkle chime, magical twinkles. No human voices.', 'A short magical premium jingle.')
job(4, '66_upgrade_evolve', 6, [EEVEE], 'Eevee glows with evolution light', [
    'Face close-up of <Subject 1> closing its eyes as it starts glowing bright white.',
    'At 00:02, the shot cuts to: close-up of the glowing white silhouette pulsing with rainbow rings of light.',
    'At 00:04, the shot cuts to: a blinding burst of rainbow light and golden stars filling the frame.'],
    'Evolution hum rising, crystal chimes, bright burst. No human voices.', 'Rising magical evolution music ending in a fanfare.')
job(4, '67_round_end', 5, [PIKA], 'Pikachu returns to the forest', [
    'Medium close-up of <Subject 1> walking back into a calm sunlit forest, then sitting down on a mossy log and waving a paw happily.'],
    'Forest ambience, soft footsteps, birdsong. No human voices.', 'Calm gentle music.')

# ---------- 審查後追加（2026-10-19）----------
job(1, '68_round_dance', 8, [PIKA, EEVEE], 'Pikachu and Eevee celebrate on a festival stage during the jackpot rounds', [
    'Medium close-up of <Subject 1> and <Subject 2> side by side dancing happily on a glowing festival stage at night, hopping and swaying in rhythm, confetti and golden sparkles falling, colorful stage lights sweeping, fireworks bursting behind them, camera gently orbiting in front of them. ' + LOOP],
    'Festival crowd cheer, firework pops, happy Pokémon calls. No human voices.', 'Upbeat joyful festival dance music.')
job(1, '69_round_fly', 8, [CHARIZ, PIKA], 'Charizard carries Pikachu over a night sky full of fireworks', [
    'Medium close-up of <Subject 2> riding happily on the back of <Subject 1>, both facing forward, flying over a glittering night city full of colorful fireworks, camera flying alongside them in profile, sparks and light trails streaming past. ' + LOOP],
    'Wind rush, wing beats, firework pops, happy calls. No human voices.', 'Upbeat heroic celebration music.')
job(1, '70_lose_partner_b', 5, [CHAR], 'Charmander\'s flame fizzles out', [
    'Face close-up of <Subject 1> taking a deep breath and puffing out its chest, ready to breathe fire.',
    'At 00:02, the shot cuts to: face close-up of <Subject 1> letting out only a tiny puff of grey smoke instead of fire, eyes blinking in surprise.',
    'At 00:03, the shot cuts to: medium close-up of <Subject 1> coughing a little smoke cloud and slumping its shoulders, embarrassed sweat drop.'],
    'Deep inhale, tiny puff, cough, sad trombone wah-wah. No human voices.', 'No music.')
job(1, '71_lose_wild_b', 5, [MEOW], 'Meowth escapes from a Great Ball', [
    'Close-up of a blue Great Ball with red stripes on the ground wobbling once, twice.',
    'At 00:02, the shot cuts to: the ball bursts open in a flash of red light and <Subject 1> pops out, landing on its feet.',
    'At 00:03, the shot cuts to: medium close-up of <Subject 1> winking cheekily and scampering away out of frame.'],
    'Two wobble clicks, pop burst, cheeky laugh, quick footsteps, sad trombone. No human voices.', 'No music.')
job(2, '72_rush_last', 5, [CHARIZ], 'the last spin of RUSH', [
    'Extreme face close-up of <Subject 1> against a deep red glowing background, its eyes narrowing and then flashing bright, the tail flame flaring into a wall of fire behind it, camera pushing in fast.'],
    'Heartbeat thump, fire roar swelling, sharp tension sting. No human voices.', 'A tense dramatic sting.')

# ---------- 第五批：多幾位待機主角、回合 loop（免費時段剩餘時間）----------
job(5, '73_idle_charmander', 8, [CHAR], 'Charmander warms itself by a campfire at dusk', [
    'Medium shot of <Subject 1> sitting happily beside a small crackling campfire on a grassy hill at dusk, swaying gently, its tail flame flickering in rhythm with the campfire, fireflies drifting, camera slowly orbiting in front of it. ' + LOOP],
    'Crackling campfire, crickets, a soft happy Charmander call. No human voices.')
job(5, '74_idle_meowth', 8, [MEOW], 'Meowth admires a shiny coin in a sunny town square', [
    'Medium shot of <Subject 1> standing on two legs in a sunny cobblestone town square, flipping a shiny gold coin in the air and catching it, grinning proudly, pigeons wandering behind, camera gently drifting in front of it. ' + LOOP],
    'Coin flip ting, town ambience, a smug Meowth chuckle. No human voices.')
job(5, '75_idle_gengar', 8, [GENG], 'Gengar plays peekaboo in a moonlit haunted mansion', [
    'Medium shot of <Subject 1> floating playfully in a moonlit haunted mansion hallway full of candles, sinking into its shadow and popping back up with a mischievous grin, purple mist swirling, camera slowly pushing in. ' + LOOP],
    'Ghostly whoosh, soft eerie chuckle, candle flicker. No human voices.')
job(5, '76_round_splash', 8, [SQUIR, BULBA], 'Squirtle and Bulbasaur celebrate with a water fountain show', [
    'Medium shot of <Subject 1> and <Subject 2> side by side in a sunny park, <Subject 1> spraying sparkling arcs of water into the air that form rainbows while <Subject 2> waves its vines happily, confetti of leaves and water droplets glittering, camera gently orbiting in front of them. ' + LOOP],
    'Water splashes, happy calls, festive chimes. No human voices.', 'Upbeat joyful celebration music.')

# ======================================================================================
# 2026-10-19 第二輪：每個號碼一整套、影片不要配樂、眼睛照原作、長回合影片
# ======================================================================================
EYES = ("Every Pokémon keeps its official eye design in every frame: Snorlax's eyes always stay closed as thin sleepy lines, "
        "Gengar keeps its red eyes, Mewtwo keeps its calm purple eyes. Eyes may close happily or turn into dizzy swirl eyes, "
        "but they never glow, never sparkle with light, never change color or shape, and Snorlax never opens its eyes. ")
STYLE = STYLE + ' ' + EYES
NOMUSIC = 'None. There is no background music, no score, no jingle and no fanfare at all; the soundtrack is only the sound effects described above.'
def job2(batch, name, sec, subs, summary, shots, sfx):
    J.append((batch, name, sec, subs, summary, shots, sfx + ' No music.', NOMUSIC))

# 每個號碼：對手／場景（夥伴組 1–5 跟固定對手打，野生組 6–9 由皮卡丘對戰後收服）
TEAM = {
  1: (BULBA, SQUIR, 'a sunny forest clearing', 'Bulbasaur', 'Squirtle', 'vines and razor leaves', 'a water gun'),
  2: (CHAR, BULBA, 'a rocky meadow at the foot of a volcano', 'Charmander', 'Bulbasaur', 'a stream of fire', 'whipping vines'),
  3: (SQUIR, CHAR, 'a sunny beach with rocks', 'Squirtle', 'Charmander', 'a water gun', 'a burst of flame'),
  4: (PIKA, MEOW, 'a town street at dusk', 'Pikachu', 'Meowth', 'crackling thunderbolts', 'swiping claws'),
  5: (EEVEE, GENG, 'a moonlit garden', 'Eevee', 'Gengar', 'a swirl of shining stars', 'a dark shadow ball'),
}
WILD = {
  6: (SNOR, 'a grassy road blocked by a huge sleeping Snorlax under a big tree', 'Snorlax'),
  7: (MEOW, 'a moonlit town alley full of crates', 'Meowth'),
  8: (GENG, 'a candle-lit haunted mansion hall', 'Gengar'),
  9: (MEWT, 'a glowing crystal cave', 'Mewtwo'),
}
SYMN = {1: 'bulbasaur', 2: 'charmander', 3: 'squirtle', 4: 'pikachu', 5: 'eevee', 6: 'snorlax', 7: 'meowth', 8: 'gengar', 9: 'mewtwo'}
LOSE_SFX = ' sad trombone wah-wah.'
for n in range(1, 10):
    nm = SYMN[n]
    if n in TEAM:
        me, rv, place, A, B, myAtk, rvAtk = TEAM[n]
        subs = [me, rv]
        job2(6, f'1{n}1_sp_{nm}', 10, subs, f'{A} faces {B} in a battle at {place}', [
            f'Face close-up of <Subject 1> at {place}, determined, getting ready to battle.',
            f'At 00:03, the shot cuts to: medium shot of <Subject 2> appearing across from it, ready to fight, the two facing each other.',
            f'At 00:06, the shot cuts to: medium shot of <Subject 2> attacking with {rvAtk} and <Subject 1> jumping aside, then both squaring off again, tension building.'],
            'Wind, footsteps, attack whooshes, impacts, tension rising.')
        job2(6, f'1{n}2_spsp_{nm}', 12, subs, f'the final showdown between {A} and {B}', [
            f'Medium shot of <Subject 1> and <Subject 2> facing each other at {place} at sunset, a strong wind blowing leaves and sparks between them.',
            f'At 00:03, the shot cuts to: face close-up of <Subject 2> powering up, energy swirling around it.',
            f'At 00:06, the shot cuts to: face close-up of <Subject 1> powering up {myAtk}, the light around it growing brighter and brighter.',
            f'At 00:09, the shot cuts to: medium shot of both charging at each other, the clash about to happen.'],
            'Howling wind, energy charging, rumbling ground, a huge build-up of tension.')
        job2(6, f'1{n}3_blose_{nm}', 5, subs, f'{B} wins the battle against {A}', [
            f'Medium shot of <Subject 2> hitting <Subject 1> with {rvAtk}.',
            f'At 00:02, the shot cuts to: medium shot of <Subject 1> tumbling back and sitting down dizzy with swirl eyes and little stars circling its head, while <Subject 2> cheers.'],
            'Attack impact, comic tumble, dizzy chirps,' + LOSE_SFX)
        job2(6, f'1{n}4_lose_{nm}', 5, [me], f'{A} just misses', [
            f'Medium shot of <Subject 1> at {place} trying to attack with {myAtk}, but it fizzles out.',
            f'At 00:02, the shot cuts to: face close-up of <Subject 1> blinking in surprise, then drooping with a small embarrassed sweat drop.'],
            'A weak fizzle, a small surprised call,' + LOSE_SFX)
    else:
        me, place, A = WILD[n]
        subs = [PIKA, me]
        job2(6, f'1{n}1_sp_{nm}', 10, subs, f'Pikachu battles a wild {A} in {place}', [
            f'Medium shot of <Subject 2> in {place}.',
            f'At 00:03, the shot cuts to: face close-up of <Subject 1> facing it, cheeks crackling with electricity, determined.',
            f'At 00:06, the shot cuts to: medium shot of <Subject 1> firing a thunderbolt at <Subject 2>, sparks flying, the battle heating up.'],
            'Electric crackles, thunder zap, impacts, tension rising.')
        job2(6, f'1{n}2_spsp_{nm}', 12, subs, f'the big battle against a wild {A}', [
            f'Medium shot of <Subject 2> in {place}, the air trembling with its power.',
            f'At 00:03, the shot cuts to: face close-up of <Subject 1> gathering a huge charge of electricity, the light flickering around it.',
            f'At 00:06, the shot cuts to: medium shot of <Subject 2> striking back with all its power.',
            f'At 00:09, the shot cuts to: medium shot of <Subject 1> leaping up and unleashing a giant thunderbolt that fills the screen with light.'],
            'Rumbling ground, huge electric charge, thunder crash, a big build-up of tension.')
        job2(6, f'1{n}3_blose_{nm}', 5, subs, f'the wild {A} gets away after the battle', [
            f'Medium shot of <Subject 2> shrugging off the attack and escaping out of frame.',
            f'At 00:02, the shot cuts to: face close-up of <Subject 1> panting, ears drooping in disappointment.'],
            'Escape whoosh, tired panting,' + LOSE_SFX)
        lose_shot = {
            6: 'a red-and-white Poké Ball bouncing off <Subject 1>\'s big belly and rolling away while <Subject 1> keeps sleeping peacefully with its eyes closed',
            7: 'a blue Great Ball bursting open in a red flash and <Subject 1> hopping out, winking cheekily and running off',
            8: 'a red-and-white Poké Ball flying straight through <Subject 1>\'s ghostly body while it sticks its tongue out and fades into the shadows',
            9: 'a purple Master Ball stopped in mid-air by a blue psychic glow and dropped to the ground while <Subject 1> floats calmly',
        }[n]
        job2(6, f'1{n}4_lose_{nm}', 5, [me], f'the wild {A} escapes the ball', [
            f'Medium shot in {place}: {lose_shot}.'],
            'Ball whoosh, bounce or pop,' + LOSE_SFX)
    # 中獎（沒有配樂的新版）
    if n in TEAM:
        me, rv, place, A, B, myAtk, rvAtk = TEAM[n]
        job2(7, f'2{n}0_win_{nm}', 6, [me, rv], f'{A} wins the battle', [
            f'Face close-up of <Subject 1> at {place}, unleashing {myAtk} toward the camera.',
            f'At 00:02, the shot cuts to: medium shot of <Subject 2> hit by the attack, falling over dizzy with swirl eyes.',
            f'At 00:04, the shot cuts to: medium shot of <Subject 1> doing a proud happy victory pose as golden sparkles fall.'],
            'Attack whoosh, big impact, comic thud, victory sparkle chimes.')
    else:
        me, place, A = WILD[n]
        ball = {6: 'red-and-white Poké Ball', 7: 'blue Great Ball with red stripes', 8: 'red-and-white Poké Ball', 9: 'purple Master Ball with two pink bumps'}[n]
        job2(7, f'2{n}0_cap_{nm}', 6, [me], f'{A} is caught in a {ball}', [
            f'Medium shot of <Subject 1> in {place}, then a {ball} flies in from the side, pops open and a beam of red light pulls <Subject 1> inside.',
            f'At 00:02, the shot cuts to: close-up of the closed {ball} on the ground, wobbling one, two, three times, the center button glowing.',
            f'At 00:04, the shot cuts to: close-up of the {ball} clicking shut and a burst of golden stars around it.'],
            'Ball throw whoosh, beam zap, three wobble clicks, final click, star burst chimes.')

# 聽牌登場：眼睛不對的三支重做
job2(7, '324_reach_pikachu', 5, [PIKA], 'Pikachu\'s reach entrance', [
    'Face close-up of <Subject 1> on a dark glowing stage, its red cheeks sparking with yellow electricity, a confident smile, camera pushing in fast. A ring of light pulses around it.'],
    'Electric crackling building to a zap, rising tension sting.')
job2(7, '326_reach_snorlax', 5, [SNOR], 'Snorlax\'s reach entrance', [
    'Medium shot of <Subject 1> on a dark glowing stage, sleeping with its eyes closed, then giving a huge yawn and stretching its arms, eyes still closed, camera pushing in. A ring of light pulses around it.'],
    'Big yawn, heavy rumble, rising tension sting.')
job2(7, '329_reach_mewtwo', 5, [MEWT], 'Mewtwo\'s reach entrance', [
    'Medium shot of <Subject 1> floating on a dark stage, a shimmering blue psychic aura flowing around its body (not its eyes), calm purple eyes, camera pushing in. A ring of light pulses around it.'],
    'Deep psychic hum swelling, rising tension sting.')

# 大獎回合：6 支 15 秒，依序輪播不重複
ROUND = [
  ('401_round_dance', [PIKA, EEVEE], 'Pikachu and Eevee dance on a festival stage', 'Medium shot of <Subject 1> and <Subject 2> dancing happily side by side on a glowing festival stage at night, confetti falling, fireworks behind them', 'Festival crowd cheers, firework pops, happy calls, clapping rhythm.'),
  ('402_round_fly', [CHARIZ, PIKA], 'Charizard carries Pikachu over a city of fireworks', 'Medium shot of <Subject 2> riding on the back of <Subject 1>, both facing forward, flying over a glittering night city full of fireworks, camera flying alongside', 'Wind rush, wing beats, firework pops, happy calls.'),
  ('403_round_splash', [SQUIR, BULBA], 'Squirtle and Bulbasaur put on a water show', 'Medium shot of <Subject 1> spraying sparkling arcs of water that form rainbows while <Subject 2> waves its vines happily in a sunny park', 'Water splashes, happy calls, festive chimes.'),
  ('404_round_parade', [SNOR, PIKA], 'a Snorlax parade float', 'Medium shot of <Subject 1> sleeping peacefully with its eyes closed on a flower-covered parade float, <Subject 2> sitting on its belly waving, rolling down a confetti-filled street', 'Parade crowd cheers, confetti, gentle snoring, happy calls.'),
  ('405_round_beach', [CHAR, SQUIR], 'Charmander and Squirtle play at the beach', 'Medium shot of <Subject 1> and <Subject 2> bouncing a big beach ball back and forth on a sunset beach, splashing in the waves, laughing', 'Waves, ball bounces, splashes, happy calls.'),
  ('406_round_carnival', [MEOW, GENG], 'Meowth and Gengar at a night carnival', 'Medium shot of <Subject 1> tossing shiny gold coins into the air like a fountain while <Subject 2> juggles glowing purple orbs at a colorful night carnival', 'Carnival ambience, coin jingles, magical whooshes, crowd cheers.'),
]
for name, subs, summ, shot, sfx in ROUND:
    job2(7, name, 15, subs, summ, [
        f'{shot}, camera gently orbiting in front of them.',
        'At 00:05, the shot cuts to: face close-up of <Subject 1> smiling and celebrating.',
        'At 00:10, the shot cuts to: medium shot of both together again, celebrating even more as the party grows.'], sfx)
# RUSH 背景：3 支 15 秒輪播
for name, summ, shot in [
    ('411_rush_sunset', 'Charizard flies above a sea of sunset clouds', 'Medium shot of <Subject 1> gliding above a golden sea of sunset clouds, camera flying alongside it in profile'),
    ('412_rush_storm', 'Charizard races through a lightning storm', 'Medium shot of <Subject 1> racing through dark storm clouds as yellow lightning bolts flash all around it, camera flying alongside'),
    ('413_rush_ocean', 'Charizard skims over the ocean at dusk', 'Medium shot of <Subject 1> skimming low over the ocean at dusk, its wingtips throwing up sparkling spray, camera flying alongside')]:
    job2(7, name, 15, [CHARIZ], summ, [
        f'{shot}, tail flame blazing.',
        'At 00:05, the shot cuts to: face close-up of <Subject 1> roaring with determination, wind rushing past.',
        'At 00:10, the shot cuts to: medium shot of <Subject 1> diving and climbing again at high speed.'],
        'Strong wind rush, heavy wing beats, flame crackle, a roar.')

# 其他有配樂的影片：拿掉配樂重做
MEWTEXT = (None, 'Mew, the small pink psychic Pokémon with big blue eyes and a long thin tail')
PIDGEY = (None, 'Pidgey, the small brown bird Pokémon')
job2(8, '502_group_pidgey', 5, [PIKA, PIDGEY], 'a flock of Pidgey flies past', [
    'Medium shot of <Subject 1> looking up in a meadow as a big flock of <Subject 2> sweeps across the sky above it, feathers drifting down.'],
    'Many flapping wings, chirping birds, a gust of wind.')
job2(8, '503_cutin_red', 5, [CHARIZ], 'a red cut-in', [
    'Extreme face close-up of <Subject 1> against a solid glowing red energy background, flames bursting toward the camera, the camera zooming in fast, speed lines radiating.'],
    'Fire burst, roar, sharp whoosh.')
for nm_, col, sub, act, sfx in [('560_cutin_blue', 'blue', SQUIR, 'water splashing toward the camera', 'Splash, sharp whoosh.'),
                                ('561_cutin_green', 'green', BULBA, 'leaves swirling toward the camera', 'Leaf whoosh, sharp whoosh.'),
                                ('562_cutin_gold', 'gold', PIKA, 'golden lightning bursting toward the camera', 'Thunder burst, sharp whoosh.')]:
    job2(8, nm_, 5, [sub], f'a {col} cut-in', [f'Extreme face close-up of <Subject 1> against a solid glowing {col} energy background, {act}, the camera zooming in fast, speed lines radiating.'], sfx)
job2(8, '563_group_caterpie', 5, [BULBA, (None, 'Caterpie, the small green caterpillar Pokémon with a red antenna')], 'a line of Caterpie crawls by', [
    'Close-up at ground level of a line of <Subject 2> crawling along a leafy branch past <Subject 1>, who watches them curiously.'],
    'Soft squishy crawling, cute chirps.')
job2(8, '564_group_magikarp', 5, [SQUIR, (None, 'Magikarp, the orange-red fish Pokémon with big whiskers')], 'a school of Magikarp jumps out of the water', [
    'Medium shot of <Subject 1> swimming in a sparkling river, surprised as many <Subject 2> leap out of the water all around it, splashing toward the camera.'],
    'Lots of splashing and flopping, a comic boing.')
job2(8, '510_zenkaiten', 6, [PIKA, MEWTEXT], 'Mew swirls through a rainbow vortex', [
    'Face close-up of <Subject 1> looking up in awe, rainbow light on its face.',
    'At 00:02, the shot cuts to: medium shot of <Subject 2> spinning playfully through a huge swirling rainbow vortex of light.'],
    'Magical whoosh, sparkling chimes, a playful giggle.')
job2(8, '512_rush_in', 8, [CHARIZ], 'Charizard bursts out of a volcano into the sky', [
    'Medium shot of an erupting volcano, then <Subject 1> bursting out of the glowing lava with wings spread wide.',
    'At 00:04, the shot cuts to: medium shot of <Subject 1> rocketing up into the sky, trailing a long streak of fire.'],
    'Volcano rumble, lava burst, mighty roar, rushing wind.')
job2(8, '514_premium_mew', 5, [PIKA, MEWTEXT], 'Mew blinks inside a rainbow bubble', [
    'Medium shot of <Subject 2> curled up inside a floating rainbow soap bubble on a soft pastel sky, blinking and smiling at <Subject 1>, who stares in amazement.'],
    'Soft magical twinkles, bubble shimmer.')
job2(8, '565_premium_shiny', 5, [EEVEE], 'a rare shiny Eevee', [
    'Face close-up of <Subject 1> now with rare shiny silver-white fur and a pale collar, blinking cutely as rainbow sparkles swirl around it on a soft pastel background.'],
    'Shiny sparkle chime, magical twinkles.')
job2(8, '556_chain_ride', 6, [CHARIZ, PIKA], 'Pikachu rides Charizard in a fast dash', [
    'Medium shot of <Subject 2> riding on the back of <Subject 1>, both facing forward, dashing through golden sunset clouds, camera flying alongside.',
    'At 00:03, the shot cuts to: face close-up of <Subject 1> roaring with joy, speed lines streaming past.'],
    'Rushing wind, roar, electric crackles.')
job2(8, '557_chain_mega', 6, [CHARIZ], 'Charizard is wrapped in mega evolution light', [
    'Face close-up of <Subject 1> in the sky, wrapped in a glowing rainbow energy cocoon.',
    'At 00:03, the shot cuts to: medium shot of <Subject 1> bursting out of the light, now dark black with blue flames, roaring powerfully.'],
    'Energy surge, crystal chime, explosive roar, blue flames.')
job2(8, '558_chain_hooh', 6, [PIKA, HOOH], 'Ho-Oh flies across a rainbow', [
    'Face close-up of <Subject 1> looking up in awe, rainbow light on its face.',
    'At 00:02, the shot cuts to: medium shot of <Subject 2> flying across a huge rainbow at sunset, golden feathers trailing sparkles.'],
    'Majestic bird cry, sparkling chimes, wind.')
job2(8, '559_rush_end', 6, [CHARIZ], 'Charizard lands at sunset', [
    'Medium shot of <Subject 1> slowly descending onto a rocky hill at sunset, wings spread wide.',
    'At 00:03, the shot cuts to: face close-up of <Subject 1> folding its wings and closing its eyes calmly, tail flame flickering softly.'],
    'Slow wing beats, soft landing thud, evening wind.')
job2(8, '572_rush_last', 5, [CHARIZ], 'the last spin of RUSH', [
    'Extreme face close-up of <Subject 1> against a deep red glowing background, eyes narrowing with determination, the tail flame flaring into a wall of fire behind it, camera pushing in fast.'],
    'Heartbeat thumps, fire roar swelling.')
job2(8, '566_upgrade_evolve', 6, [EEVEE], 'Eevee glows with evolution light', [
    'Face close-up of <Subject 1> closing its eyes as it starts glowing bright white.',
    'At 00:02, the shot cuts to: close-up of the glowing white silhouette pulsing with rainbow rings of light.',
    'At 00:04, the shot cuts to: a blinding burst of rainbow light and golden stars filling the frame.'],
    'Evolution hum rising, crystal chimes, a bright burst.')
job2(8, '567_round_end', 5, [PIKA], 'Pikachu returns to the forest', [
    'Medium shot of <Subject 1> walking back into a calm sunlit forest, then sitting on a mossy log and waving a paw happily.'],
    'Forest ambience, soft footsteps, birdsong.')

GPT_REFS = {
    'spearow': 'Spearow', 'beedrill': 'Beedrill', 'bellsprout': 'Bellsprout', 'geodude': 'Geodude', 'rattata': 'Rattata',
    'dragonite': 'Dragonite', 'moltres': 'Moltres', 'articuno': 'Articuno', 'blastoise': 'Blastoise',
    'gyarados': 'Gyarados', 'hooh': 'Ho-Oh', 'magikarp': 'Magikarp',
}

def build(b, name, sec, subs, summary, shots, sfx, music):
    sd, rl, pic = [], [], 0
    for i, (r, d) in enumerate(subs, 1):
        if r:
            pic += 1
            sd.append(f'<Subject {i}> is ' + d.format(n=pic) + ', with the same body shape, colors and markings.')
            rl.append(f'<Subject {i}>: fully_preserved - body shape, colors and markings follow <Picture {pic}>.')
        else:
            sd.append(f'<Subject {i}> is ' + d + ', drawn exactly in its official Pokémon design (no reference picture).')
    ret = '\n'.join(rl) if rl else 'All subjects follow their official Pokémon designs.'
    k = len(shots)
    body = '\n'.join(f'[Shot {i}] {s}' for i, s in enumerate(shots, 1))
    return (f'subject_definitions:\n' + '\n'.join(sd) + '\n\n'
            f'summary:\n[reference generation] A {sec}-second, {k}-shot 16:9 3D-animated Pokémon clip: {summary}. It contains ONLY the {k} shot(s) described below.\n\n'
            f'retention_analysis:\n{ret}\n\n'
            f'detailed_description:\n{STYLE}\n{body}\n\n'
            f'overall_soundscape:\n{sfx}\n\n'
            f'non_diegetic_music:\n{music}\n')


BATCH = {}
for k in ['30','31','32','33','34','35','36','37','38','56','57','58','59','72','50','51','52']: BATCH[k] = 2
for k in ['41','42','43','44','45','46','47','48','49','67']: BATCH[k] = 3
for k in ['62','64','66','53','54','55']: BATCH[k] = 4
for k in ['60','61','63','65']: BATCH[k] = 9
J = [(BATCH.get(j[1][:2], j[0]) if j[1][2] == '_' else j[0],) + j[1:] for j in J]   # only the old two-digit names
# RUSH 聽牌做短版
J = [(j[0], j[1], 6 if j[1][2] == '_' and j[1].endswith('_reach') and j[1].startswith(('50','53')) else (5 if j[1][2] == '_' and j[1][:2] in ('51','54') else j[2])) + j[3:] for j in J]
J.sort(key=lambda j: (j[0], j[1]))
os.makedirs(f'{HERE}/prompts', exist_ok=True)
rows = []
for j in J:
    txt = build(*j)
    assert len(txt) < 5000, (j[1], len(txt))
    open(f'{HERE}/prompts/{j[1]}.txt', 'w', encoding='utf-8').write(txt)
    refs = [r for r, _ in j[3] if r]
    rows.append('\t'.join([str(j[0]), j[1], str(j[2])] + refs + [''] * (3 - len(refs))))
open(f'{HERE}/jobs.tsv', 'w').write('batch\tname\tsec\tref1\tref2\tref3\n' + '\n'.join(rows) + '\n')
open(f'{HERE}/refs_gpt.tsv', 'w').write('\n'.join(
    f'{k}.png\tOfficial-looking 3D CG render of the Pokémon {v} in the glossy style of modern Pokémon games, full body, front three-quarter view, neutral standing pose, plain pure white background, no text, no shadow clutter, 16:9 not required, square 1024x1024'
    for k, v in GPT_REFS.items()) + '\n')
print(len(J), 'jobs;', sum(1 for j in J if j[0] == 1), 'in batch 1; max prompt', max(len(build(*j)) for j in J))
