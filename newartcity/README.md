# New Art City exhibition pack (free plan)

This folder is the upload pack for [New Art City](https://www.newart.city). It shares the same island and the same seven statements as the standalone site. The full website is a third-person pastel toon island: tap the ground to walk, stay until the words clear, and keep what you find in a journal. New Art City cannot run custom shaders or the stay-to-reveal interaction, so the space holds a baked model and typographic panels, with a link out to the complete piece.

**Packed for the free plan: one space, 40MB of uploads in total, no livestream.** This pack is still well under that limit, so you can add a short looping MP4 of your TouchDesigner output (about 4–8MB, keeping the whole pack under about 35MB).

Please register and create a space with your own account at [newart.city/join](https://www.newart.city/join). This pack does not create an account for you.

## Upload list

| File | Type | Suggested use |
| --- | --- | --- |
| `cover.jpg` | Cover | Space cover image |
| `models/island-and-places.glb` | 3D | The island and the seven places, scaled to about 12 meters wide |
| `panels/00-enter.jpg` | Image | Entrance note, placed near the spawn point |
| `panels/01-listening-basin.jpg` … `07-the-boat.jpg` | Image | Typographic panels for the seven statements |
| `audio/waves.mp3` | Sound | Shore ambience, looping |
| `audio/drone.mp3` | Sound | A soft low tone, looping |
| `audio/first-light-on-the-water.mp3` | Sound | Original piano, looping — *First Light on the Water* |
| Your own `loop.mp4` (optional) | Video | A looping excerpt of TouchDesigner output |

## How to install the space

1. Sign in and create a space (the free plan allows one).
2. Set `cover.jpg` as the cover.
3. Upload `island-and-places.glb`, place it at the origin, on the ground. The model is already scaled to about 12 meters wide; if it feels too large or too small, only adjust the scale, do not break it apart. The south side (the beach facing the sea) should face the visitor spawn, so people arrive as if they had just come ashore.
4. Stand the seven statement panels beside the matching places (do not block walking), a little above eye level, turned slightly toward the visitor:

   | Panel | Place | Position on the island (model space, units ≈ meters) |
   | --- | --- | --- |
   | `01-listening-basin.jpg` | The Listening Basin | West, about (-3.5, 1.5) |
   | `02-the-lantern.jpg` | The Lantern | North shore, about (1.2, -4.9) |
   | `03-the-crossing.jpg` | The Crossing | Northwest, about (-2.6, 2.7) |
   | `04-the-window.jpg` | The Window | Center-north, about (0.4, -0.5) |
   | `05-the-circle.jpg` | The Circle | East, about (2.7, -1.5) |
   | `06-unfinished-hull.jpg` | The Unfinished Hull | Southeast, about (2.1, 2.4) |
   | `07-the-boat.jpg` | The Boat | Southeast shore, about (3.0, 3.7) |

5. Place `00-enter.jpg` near the spawn, and put the URL of the full website in the space description or on a small text object: https://liuy807-jpg.github.io/manifesto-island/
6. Upload the looping audio. Use `first-light-on-the-water.mp3` as the main music, with `waves.mp3` near the shore if you want a second layer. Keep levels gentle.
7. If you have a TouchDesigner loop, upload it as a Video piece and set it to loop. The free plan cannot livestream.

The stay-to-reveal mechanic, the shared Drift archipelago, and the live TouchDesigner hook all live on the standalone website, not inside New Art City.
