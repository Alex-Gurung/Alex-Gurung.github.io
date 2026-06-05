# LiteReason architecture animation

This folder contains the Manim source for the high-level LiteReason architecture
video used on `/litereason/`.

Render from the repository root:

```bash
LITEREASON_RENDER_SCALE=4 LITEREASON_TEXT_RENDER_SCALE=6 uv run --with manim manim animations/litereason_arch/litereason_arch.py LiteReasonArchitecture --media_dir .manim_review/litereason_arch
```

The scene config defaults to 4x output, rendering at 7680x4320/60fps so
small text is rasterized cleanly before downsampling. Text objects are rendered
larger internally and then scaled into the diagram to reduce font artifacts.
The Manim output is written under
`.manim_review/litereason_arch/videos/litereason_arch/4320p60/LiteReasonArchitecture.mp4`.
Downsample and compress it for the site:

```bash
ffmpeg -i .manim_review/litereason_arch/videos/litereason_arch/4320p60/LiteReasonArchitecture.mp4 \
  -vf scale=1920:1080 \
  -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an \
  assets/video/litereason/architecture.mp4
```

Create the poster from the first fully visible frame:

```bash
ffmpeg -ss 1.55 -i .manim_review/litereason_arch/videos/litereason_arch/4320p60/LiteReasonArchitecture.mp4 \
  -frames:v 1 -vf scale=1920:1080 -update true assets/img/litereason/architecture-poster.png
```

The page expects:

- `assets/video/litereason/architecture.mp4`
- `assets/img/litereason/architecture-poster.png`
