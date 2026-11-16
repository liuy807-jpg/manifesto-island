# Approach: Island — Case study

**Role:** Concept, interaction, and implementation  
**Context:** Final zine for a Digital Media Art course; also a portfolio piece toward a future application to Riot Games  
**Time:** Part 1 of a three-chapter work (*Approach → Drift → Landing*)  
**Stack:** Vite, three.js, custom GLSL (sky and sea), Web Audio, Web Speech, a small optional WebSocket bridge to TouchDesigner  
**Live draft:** a temporary HTTPS preview (see README for moving it to GitHub Pages, Vercel, or Netlify)

## The problem

The manifesto asks for work that goes to people, that treats the boundary between the inner and outer world as a membrane, and that holds a recurring dream: a small boat, alone at sea, watching the sun rise. A typographic scroller could carry the words. It could not let a visitor *walk into* that inner world.

The typographic first draft (*Approach*) proved the core mechanic: words start in fog, and they only sharpen if you stay. This version keeps that contract and changes the form. The zine is now a place.

## The place

You come ashore on a small island in soft pastel daylight, seen from a slightly elevated three-quarter view, following a small traveler. Each of the seven beliefs is a modest, symbolic object — a listening basin, a lantern, a plank crossing, a hut with a warm window, a stone circle, an unfinished hull, and the boat. You walk by clicking the ground or using the keys. When you are close and still, the statement comes out of the fog; if you rush, it scatters. Trust, once earned, returns faster the next time. Found statements are kept in a journal (0/7). The sky moves from a lavender dawn toward a golden sunrise as more places are found. At the boat, a short teaser points toward chapter two, *Drift*.

The visual language is a bright, original pastel toon world: cel-shaded lilac and peach ground, cream paths, cone trees with yellow-to-teal gradients, clusters of poppies and lupines, soft blue boulders, an invented giant plant, and a ringed planet in a pink sky, all with soft ink outlines. Typography (Fraunces, Source Sans 3, Noto Serif SC) sits in clean boxed HUD panels — a place name, a current objective, and the journal counter — rather than painted onto billboards. The feeling was studied from a Moebius-inspired reference; the island, character, and places are original. You do not read a page, you walk into a room.

## Interaction

Desktop uses click-to-walk plus WASD or the arrow keys, Q/E or drag to orbit, and a scroll wheel to zoom; a standard gamepad is also wired. Phones get tap-to-walk, a virtual joystick, and drag-to-orbit, with boxed HUD panels and a mute control that respect safe areas. Audio is generative (pink-noise shore, a drone that warms with dawn) and only starts after a gesture, including on iOS. `prefers-reduced-motion` skips the camera pull-in and keeps motion gentle. Quality starts higher on desktop and steps down if the frame time slips. Bloom and heavy grain were left off so the cel shading stays clean, and instanced flowers and grass keep the scene light on phones.

## TouchDesigner

The same GLSL is written to be portable. A thin compatibility header maps UVs, resolution, and output swizzle so a shader can be pasted into a TouchDesigner GLSL TOP. The public site always runs on its own; that is the portfolio URL.

For a live exhibition, an optional `?live=ws://…` flag connects the page to a tiny local relay. Approaching a station, earning a reveal, and the visitor’s position are sent as JSON. TouchDesigner can listen, drive lights or particles, and send a few parameters back (`skyProgress`, a sunrise cue). Presence for other visitors is reserved on the same protocol (soft glowing lights) but is not built out in this draft.

## New Art City

A companion pack in `newartcity/` lets the same island be laid out as a no-code, low-threshold gallery — other people can be in the room, and the work can sit somewhere people already know how to enter. New Art City cannot run custom shaders, so “stay to see the words” cannot live there; typographic panels stand in, and a link sends visitors to the full piece. The pack is sized for the free plan: one space, about 35 MB of uploads, no livestream. TouchDesigner output should be recorded as a short looping H.264 MP4 and uploaded as a video piece. Livestream is noted only as a paid-plan option.

## What I would do next

- Build *Drift*: each visitor leaves a picture they would want to see if they were stuck, and the island grows into an archipelago.
- Build *Landing*: an AR boat that carries another person’s picture into the room you are actually in.
- If the exhibition can support it, turn the live bridge on and let a room-scale TouchDesigner projection breathe with the people on their phones.
