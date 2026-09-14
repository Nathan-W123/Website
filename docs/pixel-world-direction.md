# Nathan's World: Pixel-World Research and Art Direction

## Executive decision

The current world should be rebuilt as a **small, authored RPG region**, not a diagram of repositories. The previous version organized projects as nodes radiating from a central portfolio hub. That communicates information architecture, but it does not feel like a place. The new version should instead use the spatial language of a classic handheld adventure: towns, routes, bridges, tree walls, cliff edges, water, landmarks, and occasional side paths. Projects become discoveries inside that geography.

The intended blend is deliberately selective:

- Use **classic Pokémon-style overworld grammar** for navigation: readable terrain tiles, route corridors, town thresholds, small landmarks, and a camera following a tiny character.
- Use **Undertale's restraint** for atmosphere and interface: sparse high-contrast dialogue, character-sized scenes, expressive silhouettes, and only enough detail to invite imagination.
- Use **Terraria's material richness** for landmark identity: recognizable buildings, warm windows, props, workshops, furniture silhouettes, and biome-specific detail.

This is not a request to imitate or reproduce copyrighted game assets. The website should use original characters, buildings, palettes, icons, and map geometry while applying the broader design principles documented below.

## What failed in the current UI

The current screenshot makes five structural problems visible:

1. **The world is read all at once.** At desktop scale the camera shows an enormous portion of the map, so buildings appear as small diagram icons rather than places the player approaches.
2. **Roads are data-visualization edges.** Every thick road returns to one centered node. This creates a hub-and-spoke chart, not a believable settlement or route network.
3. **Biomes are rectangular fields.** Hard quadrants communicate categories, but natural spaces are recognized through overlapping boundaries: rivers, cliffs, tree species, soil, architecture, flowers, and elevation.
4. **Landmarks are symbols, not buildings.** A chessboard or atom glyph conveys a topic from a distance, but it lacks entrances, surrounding props, paths, and scale cues. It feels placed on the map rather than belonging to it.
5. **Labels explain too much too early.** Floating repository names make the player scan a dashboard. A game world should first expose a place—"Starfall Observatory" or "Knight's Rest"—then reveal the associated project on interaction.

The redesign therefore changes the spatial model, camera scale, naming model, interaction UI, and art pipeline together. Merely recoloring the current procedural shapes would not fix the underlying experience.

## Research findings

### 1. Pokémon: regions first, content second

In Nintendo's interview on the creation of Unova, Junichi Masuda describes a top-down planning sequence: decide the setting, roughly place towns, then develop the region's larger organizing form. He also explains the desire for a more direct main route so more players could complete the adventure. The useful principle is not Unova's exact hexagon. It is that **geography is a navigational system before it is decoration**: towns and nature areas are placed in relation to an overall travel structure, with an accessible critical path and optional texture around it. [Nintendo, “A Brand New Pokémon World”](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Pokemon-Black-Version-and-Pokemon-White-Version/Pokemon-Black-Version-and-Pokemon-White-Version/2-A-Brand-New-Pokemon-World/2-A-Brand-New-Pokemon-World-210016.html)

For this portfolio, the equivalent is one legible route from the southern arrival point through the first three discoveries, plus loops and branches for exploration. The visitor should never need a road leading directly from a hub to every project. Rivers, forest openings, bridge crossings, and building fronts can quietly direct movement.

The Pokémon design process also emphasizes visual consistency across many different ideas. In the same Nintendo interview, Ken Sugimori describes reviewing and unifying designs before they became pixel art, while Masuda describes evaluating the color balance of the full lineup. The application here is a **shared asset grammar**: every landmark can be thematically unique, but roof angles, door sizes, shadow direction, outline weight, and material palettes must remain consistent enough to feel like one world.

Pokémon manuals reinforce a place-based interaction vocabulary: town maps, named facilities, signboards, and small destination buildings are used as navigational anchors. The lesson is that a sign or short location banner should confirm a place after the player reaches it, rather than permanent floating labels explaining everything from the start. See Nintendo's [Pokémon Pearl instruction booklet](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/DS_Pokemon_Pearl) and [Pokémon Black instruction booklet](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/DS_Pokemon_Black).

**Applied rules**

- Start at the edge of the region, not its center.
- Provide a clear first route, then loops and optional branches.
- Use trees, water, fences, ledges, and cliffs as readable boundaries.
- Keep walking paths two to four character widths.
- Give every important place an entrance clearing and one strong silhouette.
- Announce a location briefly on entry; do not permanently label every building.
- Keep all art on the same grid, shadow direction, and scale system.

### 2. Undertale: low resolution works when every mark matters

Toby Fox has said that low-resolution pixel graphics leave room for artistic interpretation. A close reading of Undertale's character art shows how tiny pixel changes can carry expression; simplicity is not the absence of design, but concentration. [Game Developer, “Heartache and Compassion in Undertale”](https://www.gamedeveloper.com/design/book-excerpt-heartache-and-compassion-in-i-undertale-i-)

This matters because the current site uses repeated texture and large symbolic objects to fill space. Undertale suggests the opposite approach: fewer, more intentional elements. One snow-covered tree line, a carefully positioned lamp, and a character-sized house can create a stronger scene than hundreds of identical scattered blocks. Detail should cluster around story and interaction points, while transition routes can breathe.

Fox also describes creating Undertale's battle engine before everything else, with the rest of the experience growing from that core interaction. The corresponding portfolio principle is to protect a simple loop: **walk → notice a distinctive place → approach its entrance or object → inspect → return to the world**. Map controls, sound, discovery counters, and lore should remain secondary to that loop. [Game Developer, “Undertale's action-based RPG battles”](https://www.gamedeveloper.com/design/game-design-deep-dive-i-undertale-i-s-action-based-rpg-battles)

A secondary analysis of Undertale's levels notes that their paths are often linear and straightforward, yet navigation, story pacing, geography, and mechanics reinforce one another. The useful inference for this site is that exploration does not require a maze. A compact world can have a clear route while still feeling rich because each space changes context and rhythm. [Game Developer, “The Hidden Level Design of Undertale”](https://www.gamedeveloper.com/design/the-hidden-level-design-of-undertale)

Undertale's original Kickstarter FAQ specified very small custom overworld sprites—up to 50×50 pixels and only a few frames. That historical constraint supports a practical target here: a roughly 24×32-pixel player at logical resolution, with short, readable animation rather than a large illustrated avatar. [Undertale Kickstarter FAQ](https://www.kickstarter.com/projects/1002143342/undertale/faqs?comment=Q29tbWVudC0xMTAzNDQwMw%3D%3D)

**Applied rules**

- Render the game at a low logical resolution and upscale with hard nearest-neighbor edges.
- Keep the player small and instantly readable.
- Use a limited palette per biome and avoid smooth gradients, blur, and scanline effects.
- Reserve dense decoration for landmarks and inhabited spaces.
- Use black dialogue panels with a light pixel border and concise copy.
- Let location silhouettes carry meaning before text does.
- Keep the primary interaction one button and immediately reversible.

### 3. Terraria: buildings become memorable through material and function

Terraria's houses are constructed from a frame, walls, an entrance, a light source, and functional furniture such as a table and chair. Even though Nathan's World uses a different camera, this vocabulary explains why Terraria buildings feel inhabited: architecture is made from visible systems and objects, not just an exterior icon. [Official Terraria Wiki, “House”](https://terraria.wiki.gg/wiki/Houses)

For top-down landmarks, interiors do not need to be fully playable in the first version. The exterior can imply function through surrounding objects: telescope platforms and star charts at the observatory; banners, weapon racks, and practice dummies around the knight statue; drying racks and bottles at the greenhouse; antenna dishes and cable reels at the signal cabin. Windows and doorway light provide a small amount of the warmth visible in Terraria builds.

Terraria also distinguishes regions through multiple layers. Biome backgrounds use their own landscape motifs, ambient entities change with biome, weather, time, or events, and music is associated with specific biomes and events. That supports a richer definition of a biome than a background color. [Official Terraria Wiki, “Biome backgrounds”](https://terraria.wiki.gg/wiki/Biome_backgrounds), [“Ambient entities”](https://terraria.wiki.gg/wiki/Backgrounds_and_Ambience), and [“Music”](https://terraria.wiki.gg/wiki/Music)

For this site, a biome should be a coordinated package:

- ground and path material;
- vegetation and boundary objects;
- landmark architecture;
- small ambient motion;
- UI accent color;
- optional sound layer.

The initial rebuild needs the visual layers and location banner. Biome-specific audio can remain a later enhancement.

### 4. Browser rendering: preserve the pixel grid

MDN's pixel-art guidance recommends creating or rendering artwork at a small native resolution and enlarging it with `image-rendering: pixelated`. It also warns that non-integer scaling can make pixels uneven. [MDN, “Crisp pixel art look with image-rendering”](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)

The site should therefore render the world to a canvas whose logical dimensions are roughly half the CSS viewport on common desktop displays, then scale it by an integer factor. Camera positions and sprite destinations should be rounded before drawing. Image smoothing must remain disabled. This will give the artwork actual pixel structure instead of placing a fake scanline texture over high-resolution vector-like shapes.

## World structure

### Regional layout

The world should be a scrolling landscape with the southern road as the arrival point. The Traveler's Archive sits close to that entrance and serves as the first low-pressure discovery. From there:

- A village loop leads northwest to Knight's Rest and the Proving Grounds.
- A forest road climbs north toward Starfall Observatory.
- A river crossing opens the eastern mosswood, where the Weaver's Guild, Printworks, Signal House, and science landmarks sit on connected local paths.
- A southwest branch reaches the coast and Gale Works.
- Several small bridges and forest gates create memorable thresholds.

The map must not have a single center from which all roads radiate. The route network should contain at least one loop, one short dead-end with a reward, and one bridge bottleneck. Decorative buildings should appear in small clusters, creating hamlets and service areas between portfolio landmarks.

### Location naming system

| World location | Project revealed on inspection | Landmark form |
| --- | --- | --- |
| Starfall Observatory | Black Hole Sim | Brass-domed observatory, telescope platform, star garden |
| Knight's Rest | Gambit | Knight statue in a compact castle courtyard |
| The Proving Grounds | Siege | Stone training arena with banners and practice targets |
| Weaver's Guild | Kumi | Loom-and-clockwork guildhall with connected workshops |
| The Printworks | Kumi Website | Red-roof print shop, poster racks, delivery cart |
| Signal House | Voice Agents | Radio cabin, antenna tower, cable reels |
| Gale Works | Aero | Coastal windmill laboratory and wind tunnel sheds |
| Atom Garden | Quantize | Molecular garden shrine with linked glowing stones |
| Glassroot Conservatory | Formulate | Alchemist greenhouse with beds, bottles, and warm lamps |
| Violet Spire | HF–SCF Engine | Crystal-topped science tower with orbit motifs |
| Traveler's Archive | Website | Warm inn/archive at the southern entrance |

The player sees the location name in the world and interaction prompt. The repository name appears only as a secondary line in the project panel: `PROJECT: GAMBIT`, for example.

## Visual system

### Grid and scale

- Logical world image: approximately 1536–2048 pixels on its long edge.
- Source tile rhythm: approximately 16 pixels.
- Player: approximately 24×32 logical pixels.
- Main buildings: approximately 144–240 pixels wide, depending on importance.
- Roads: approximately 48–80 pixels wide.
- Camera: close enough that one major building plus part of its surroundings fills a typical desktop view.
- UI: snap offsets, borders, and shadows to whole logical pixels.

### Palette

The full world should share a dark ink outline and warm cream highlight, while each district gets a restrained local palette:

- **Highlands:** pine, blue slate, faded lavender, brass, starlight cream.
- **Village/castle:** meadow green, warm dirt, terracotta, limestone, muted red banners.
- **Coast:** sea blue, windwashed teal, pale wood, oxidized copper.
- **Mosswood/science:** deep moss, bottle green, violet crystal, amber windows.

Each material needs a three- to five-tone ramp. Avoid transparent high-resolution gradients inside the world art. Lighting should be communicated by clustered color steps.

### Buildings and props

Every major landmark needs:

1. a distinct roofline or silhouette;
2. a clearly readable front/interaction side;
3. a small entrance clearing;
4. two or three props that explain its function;
5. one local color accent;
6. neighboring ordinary structures to establish scale.

The supporting settlement should include at least eighteen non-project structures: cottages, shop, inn annex, smithy, barn, farmhouse, mill, boathouse, lighthouse, forest cabins, shed, ruined tower, market stalls, wells, bridges, docks, and fenced gardens. These buildings are not filler; they stop the world from feeling like eleven isolated portfolio icons.

## Interface and interaction

### Default HUD

The default screen should have almost no dashboard chrome:

- top-left: small `NATHAN'S WORLD` plaque;
- top-center: a temporary location banner after entering a region;
- top-right: compact discoveries count plus map and sound controls;
- bottom-right: small movement hint on desktop, touch controls on mobile;
- bottom-center: interaction prompt only when near a landmark.

Remove the permanent quest card. It occupies too much of the world and frames the experience as task management.

### Interaction prompt

Use a classic dialogue treatment: black or near-black fill, two- or three-pixel cream border, square corners, no glass blur. Copy should read:

`E  Enter Starfall Observatory`

with a smaller line such as `Project: Black Hole Sim`.

### Project panel

The project panel should feel like a discovery dialogue, not a SaaS modal:

- location title first;
- `PROJECT: REPOSITORY NAME` second;
- one concise paragraph;
- three factual bullets;
- one primary repository action;
- one return action;
- a small original pixel-art vignette or cropped map detail when available.

Typography should use a pixel display face for short labels and a highly legible monospace or sans serif for body copy. Do not apply the pixel font to long paragraphs at very small sizes.

## Implementation priorities

### Phase 1: recognizable vertical slice

- Replace the procedural canvas terrain with one original cohesive pixel-art map.
- Use a low-resolution canvas with integer scaling and disabled smoothing.
- Place the player at the southern entrance.
- Implement Starfall Observatory and Knight's Rest hotspots.
- Replace repository labels with location names.
- Simplify the HUD and panel styling.

### Phase 2: full portfolio region

- Add all eleven project hotspots.
- Add approximate collision boundaries around water, cliffs, and building footprints.
- Add the map overlay with location-shaped markers.
- Persist discoveries locally.
- Add touch controls and keyboard focus handling.

### Phase 3: world depth

- Add small NPCs or ambient creatures with limited frames.
- Add wind, water, smoke, window-light, and plant animation.
- Add a short location-specific sound layer.
- Consider small building interiors for the most important projects.

## Acceptance criteria

The redesign is successful when:

- a screenshot is immediately recognizable as a top-down pixel-art game world rather than a portfolio diagram;
- no radial hub or rectangular biome quadrants are visible;
- the screen includes multiple ordinary buildings in addition to project landmarks;
- Starfall Observatory and the knight statue are visually identifiable without labels;
- all public-facing world labels are place names, not repository names;
- the player can walk, approach a landmark, open its project panel, and return to the same position;
- pixels remain crisp on a standard desktop viewport and on mobile;
- the first route is understandable without opening the map;
- the art is original and does not reproduce recognizable franchise assets.

## Sources

- Nintendo. [“A Brand New Pokémon World.”](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Pokemon-Black-Version-and-Pokemon-White-Version/Pokemon-Black-Version-and-Pokemon-White-Version/2-A-Brand-New-Pokemon-World/2-A-Brand-New-Pokemon-World-210016.html)
- Nintendo. [Pokémon Pearl instruction booklet.](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/DS_Pokemon_Pearl)
- Nintendo. [Pokémon Black instruction booklet.](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/DS_Pokemon_Black)
- Game Developer. [“Heartache and Compassion in Undertale.”](https://www.gamedeveloper.com/design/book-excerpt-heartache-and-compassion-in-i-undertale-i-)
- Toby Fox / Game Developer. [“Undertale's action-based RPG battles.”](https://www.gamedeveloper.com/design/game-design-deep-dive-i-undertale-i-s-action-based-rpg-battles)
- Game Developer. [“The Hidden Level Design of Undertale.”](https://www.gamedeveloper.com/design/the-hidden-level-design-of-undertale)
- Undertale Kickstarter. [Project FAQ.](https://www.kickstarter.com/projects/1002143342/undertale/faqs?comment=Q29tbWVudC0xMTAzNDQwMw%3D%3D)
- Official Terraria Wiki. [“House.”](https://terraria.wiki.gg/wiki/Houses)
- Official Terraria Wiki. [“Biome backgrounds.”](https://terraria.wiki.gg/wiki/Biome_backgrounds)
- Official Terraria Wiki. [“Ambient entities.”](https://terraria.wiki.gg/wiki/Backgrounds_and_Ambience)
- Official Terraria Wiki. [“Music.”](https://terraria.wiki.gg/wiki/Music)
- MDN Web Docs. [“Crisp pixel art look with image-rendering.”](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
