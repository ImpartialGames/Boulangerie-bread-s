# Design

## Theme

Sombre & premium. Noir chaud profond légèrement texturé (grain subtil), alternance avec brun espresso, une seule respiration claire crème au milieu du site (section Sur-mesure). Photographie éditoriale gastronomique : produits sur ardoise/bois foncé, lumière chaude directionnelle.

## Color Palette

| Rôle | Valeur | Usage |
|---|---|---|
| `--bg` | `#16120E` | Fond principal (noir chaud, jamais de noir pur) |
| `--bg-2` | `#241D16` | Fond secondaire espresso (alternance de sections) |
| `--cream` | `#F2EBE0` | Section claire « respiration » (Sur-mesure) |
| `--accent` | `#C99550` | Caramel doré : CTA, numéros, soulignements, détails |
| `--accent-strong` | `#DBAB66` | Caramel éclairci pour texte accent sur fond sombre (contraste) |
| `--ink-light` | `#F5F0E8` | Texte sur fond sombre (blanc cassé) |
| `--ink-dark` | `#33271B` | Texte sur la section crème (brun foncé) |
| `--muted` | `#B5A893` | Texte secondaire sur fond sombre (≥ 4.5:1 sur #16120E) |

## Typography

- **Display / titres** : Cormorant Garamond (serif élégante), grandes tailles fluides `clamp()`, ratio ≥ 1.25, graisse 500–600, italique pour la citation témoignage.
- **Corps** : Jost (sans géométrique fine), 300–400, interlignage généreux (1.7 sur fond sombre), letter-spacing léger (+0.01em sur fond sombre).
- **Sur-titres badges** : Jost 400, capitales, letter-spacing 0.16em, taille petite, dans des pills à fine bordure.
- Mesure du corps ≤ 65ch. `text-wrap: balance` sur h1–h3.

## Shape Language

- Boutons pill (border-radius 999px) : plein caramel (texte brun foncé) / outline fin blanc cassé.
- Images en cadre arche (`border-radius: 999px 999px 24px 24px` ou arc plein en haut) ou grands coins arrondis asymétriques.
- Photos superposées en décalé + pastille circulaire d'info qui chevauche (« 20 ans »).
- Grands numéros décoratifs 01. 02. 03. en Cormorant oversize, caramel semi-transparent.
- Avatars circulaires empilés, fine bordure dorée.
- Icônes minimalistes au trait fin (SVG inline, stroke 1.5).
- Grandes courbes douces entre sections (la section crème entre/sort avec des arrondis).

## Motion

- Apparitions au scroll : fade + translateY 24px, cascade sur grilles (IntersectionObserver, unobserve après).
- Compteurs animés (héro uniquement) à l'entrée dans le viewport.
- Zoom doux images : scale 1.05, 0.6s ease-out.
- Parallaxe subtil sur les photos superposées (section À propos).
- CTA : couleur + élévation légère au survol.
- Durées 0.4–0.8s, `--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1)`. Pas de bounce. `prefers-reduced-motion` : tout instantané.

## Layout

One-page, 7 sections : Héro → À propos → Produits (grille 4) → Sur-mesure (crème) → Galerie (masonry 8) → Témoignage (1 seul, très grand) → Bandeau final + footer. Mobile-first, marges fluides `clamp()`, max-width 1200px, espacement vertical de section `clamp(96px, 14vh, 160px)`.

## Assets

- `assets/logo.webp` : logo circulaire vintage « Boulangerie Bread's ».
- `assets/hero.webp` : pains & croissants, farine en suspension, fond sombre chaud — visuel héro.
- Autres photos : placeholders Unsplash (thème bakery/sourdough/pâtisserie, fonds sombres de préférence), lazy loading, prêtes à être remplacées.
