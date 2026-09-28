# GROOT teaser animation

This folder contains the Manim source for the ~41 s captioned teaser video on the
"Strategically Diverse Sampling for Self-Training" project page. It is built to be
watched muted: burned-in, subtitle-style captions sit at the bottom, one short
sentence at a time.

| Beat | Caption |
|---|---|
| Problem | Self-training on a model's own answers / barely helps on hard problems. |
| | Even with 64 samples per problem: / 5% → 8% solved at 64 tries. |
| Why (beat title: "Better training data through strategic diversity") | Independent samples mostly repeat the same strategy. |
| Fix | We ask the model for different strategies first, / then solve once per strategy. |
| Payoff | With just 4 diverse samples per problem, / the share solved at 64 tries triples: 5% → 16–18%. |
| Surprise | Even when every diverse answer is wrong, / it still beats training on correct IID answers. |
| Teacher | It even beats training on answers from a 60× larger teacher. |
| End card | Strategically Diverse Sampling for Self-Training / Diversity in approaches matters more than correctness. |

The plots use the full pass@k curves (k = 1..64, log2 x axis) for frontier problems
(ones the base model solves at most 2 of 64 times), macro-averaged over LiveCodeBench and
OJBench (Qwen3-4B-Instruct). The plot is titled "Frontier problems: LiveCodeBench +
OJBench" and carries a small "Qwen3-4B-Instruct" label. The scene reads these at
render time from `assets/js/diversity/passk.js`, so the video and the page
always show the same data. End labels use the paper's rounded Table 2 numbers. The
teacher beat is a separate comparison of solve rate at 64 tries on the same kind of
hard problems, using the paper's Table 3 held-out numbers at the 16k-token limit. It is
drawn as a plain horizontal bar chart, and the teacher bar is a light fill with a blue
outline so it reads as the baseline:

- 235B teacher, IID answers: 13.4
- the 4B model's own GROOT answers: 20.1
- the 4B model's own VS answers: 22.8

The styling matches the paper's `paper_style.py`:

- **Font:** STIX Two Text (must be installed locally).
- **Background:** white.
- **Non-data lines:** ink #2a2420. Bucket fills are #f4f4f4 and grid lines #e6e6e6.
- **Series colours (Okabe-Ito):**
  - Base: #999999, dashed.
  - IID-4: #0072B2, circles.
  - IID-64 (T=1.5): #56B4E9, hollow circles.
  - GROOT: #D55E00, squares.
  - VS: #009E73, triangles.
  - The all-wrong (ANTI) runs are dotted lines with hollow markers in the GROOT and VS colours.

Render from the repository root. Python 3.12 is pinned because `pycairo` has no
prebuilt wheel for the default interpreter on this machine:

```bash
GROOT_RENDER_SCALE=2 GROOT_TEXT_RENDER_SCALE=4 GROOT_FPS=30 \
  uv run --python 3.12 --with manim manim \
  animations/diversity_pipeline/diversity_pipeline.py GrootPipeline \
  --media_dir .manim_review/diversity_pipeline --disable_caching
```

`GROOT_RENDER_SCALE=2` renders at 3840x2160 so text is rasterized cleanly before
downsampling. For a fast layout check use
`GROOT_RENDER_SCALE=1 GROOT_TEXT_RENDER_SCALE=3 GROOT_FPS=15`. The scene prints
`BEAT` and `CAPTION` lines with timestamps while rendering.

The Manim output is written under
`.manim_review/diversity_pipeline/videos/diversity_pipeline/2160p30/GrootPipeline.mp4`.
`.manim_review/` is not gitignored, so do not commit it. Downsample and compress it
for the site:

```bash
ffmpeg -i .manim_review/diversity_pipeline/videos/diversity_pipeline/2160p30/GrootPipeline.mp4 \
  -vf "scale=1280:720:flags=lanczos,fps=30" \
  -c:v libx264 -preset veryslow -tune animation -crf 28 -g 150 -pix_fmt yuv420p \
  -movflags +faststart -an \
  assets/video/diversity/groot-pipeline.mp4
```

This 720p delivery encode is about 0.7 MB, and the captions stay crisp.

The poster is a 1280x720 JPEG (quality 85) of the fully drawn plot with all seven
curves and the all-wrong caption (t = 29.9 s):

```bash
ffmpeg -ss 29.9 -i .manim_review/diversity_pipeline/videos/diversity_pipeline/2160p30/GrootPipeline.mp4 \
  -frames:v 1 -vf scale=1280:720:flags=lanczos -q:v 3 \
  assets/img/diversity/groot-pipeline-poster.jpg
```

(`-q:v 3` is roughly JPEG quality 85. The committed poster was saved with Pillow at
`quality=85, optimize=True, progressive=True`.)

The page expects:

- `assets/video/diversity/groot-pipeline.mp4`
- `assets/img/diversity/groot-pipeline-poster.jpg`
