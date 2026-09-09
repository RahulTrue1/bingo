# Promotions page redesign QA

- Source visual truth: user-attached promotions-page screenshot from this request
- Source pixels: 3420 × 1838 original; conversation preview normalized to 2048 × 1101
- Implementation: `/`, player navigation → Promotions, `PromotionExperience`
- Intended viewport: 2048 × 1101 CSS px at device scale factor 1
- Implementation screenshot: unavailable
- Implementation pixels: unavailable
- State: promotions page, All offers selected, no rewards claimed
- Density normalization: source preview treated as a 1× comparison target; implementation normalization was not possible

## Full-view comparison evidence

The source shows a quiet page title followed by six low-detail gradient cards. The redesign preserves the dark Trueigtech shell and six-offer inventory while introducing one large campaign banner, two supporting banners, a reward summary, category filters and image-led offer cards.

Three original 1672 × 941 campaign artworks were generated for Free Bingo, VIP Gold and Weekend Cup. Existing room artwork supports the three secondary promotions so every visible offer has authentic Bingo imagery.

The in-app browser runtime could not initialize because its packaged client requested a restricted Node module. The implementation could not be opened or captured at the target viewport, so a full-view visual comparison cannot be claimed.

## Focused region comparison evidence

The three generated assets were opened and inspected directly for composition, Bingo-specific subjects, image quality and left-side copy space. Focused browser comparisons of runtime crops, typography, grid alignment, hover states and responsive breakpoints were not possible without a browser-rendered screenshot.

## Findings

- [P1] Browser-rendered evidence is unavailable.
  - Location: Promotions page, `.promotion-feature-grid` and `.promotion-offer-grid`.
  - Evidence: the source screenshot and all three generated campaign assets are available, but no implementation screenshot could be captured at the same viewport.
  - Impact: final image crops, vertical rhythm, text wrapping and responsive behavior cannot be visually certified.
  - Fix: capture the Promotions page at 2048 × 1101, 900 × 1100 and 390 × 844; test claim/use actions and filters; compare source and implementation together; resolve any P0/P1/P2 differences.

## Required fidelity surfaces

- Fonts and typography: existing Trueigtech font hierarchy and optical weights are reused; browser rendering and line wrapping are not visually verified.
- Spacing and layout rhythm: the feature area uses a large-plus-stacked-banner layout and the offers use 3/2/1 responsive columns; rendered proportions are not visually verified.
- Colors and visual tokens: the existing navy, violet, cyan, mint and gold tokens are reused with semantic claimed states; contrast is not browser-verified.
- Image quality and asset fidelity: all three generated banners are project-local 1672 × 941 PNGs with Bingo-specific compositions and reserved copy space; runtime cropping and sharpness are not browser-verified.
- Copy and content: all six original reward concepts remain, with clearer value, eligibility and expiry copy.

## Functional and build checks

- ESLint passes with zero findings.
- TypeScript passes with zero errors.
- Production build passes.
- Rendered HTML tests pass: 3 of 3.
- Claim/use state, category filters and room routing are implemented with native buttons and accessible pressed states.
- Browser console errors and primary interactions could not be checked without a rendered browser session.

## Comparison history

- Pass 1: blocked before visual comparison because the in-app browser runtime could not initialize. No visual pass is claimed from code inspection, asset inspection or build output alone.

## Implementation checklist

- Capture desktop, tablet and mobile promotion states.
- Test all category filters and one claim → use reward journey.
- Check console errors and image-loading failures.
- Compare the full view and focused banner/card regions against the source and resolve any P0/P1/P2 findings.

final result: blocked
