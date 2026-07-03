# Style art

Drop a hero image for any template here, named exactly after its template id:

```
public/style-art/<template-id>.jpg   (or .jpeg / .png / .webp)
```

The template ids currently in the app (see `src/lib/templates.ts`):

**Genre:** afrobeats, hiphop, kpop, gospel, rnb, pop, dancehall, reggaeton,
country, rock, edm, worship, cinematic-ballad

**Style:** anime-amv, 2d-animated, 3d-animated, luxury-fashion, afrofuturist

**Format:** performance, dance, club, street, blank-studio

No code changes needed — `TemplateCard` (`src/components/templates/TemplateCard.tsx`)
tries `jpg` → `jpeg` → `png` → `webp` for each template id automatically, and
falls back to a clean gradient placeholder in the template's own accent color
if none exist yet. Recommended: 3:2 aspect ratio (e.g. 900×600), so the card
crops cleanly without letterboxing.
