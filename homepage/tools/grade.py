"""Warm cream colour grade for every Bloom photograph.

The source photographs run cool and bright: saturated blue skies and clipped whites that
pull the eye away from the brand red. This grade brings them into the same family as the
cream page (#F8F6EA) and the Bloom red (#962B23):

  * blues and cyans lose most of their saturation, so skies read as soft warm haze
  * overall saturation eases off a little, the way film does
  * highlights roll off towards cream instead of clipping to white
  * shadows lift slightly towards a warm brown instead of grey-black
  * midtones pick up a gentle amber warmth
"""
import numpy as np
from PIL import Image, ImageFilter

CREAM = np.array([248, 240, 224], dtype=np.float32) / 255  # highlight target, a touch warmer than the page
SHADOW = np.array([46, 30, 24], dtype=np.float32) / 255     # lifted, warm black
LUMA = np.array([0.299, 0.587, 0.114], dtype=np.float32)


def warm_grade(image: Image.Image, strength: float = 1.0) -> Image.Image:
    a = np.asarray(image.convert("RGB"), dtype=np.float32) / 255
    lum = a @ LUMA

    # 1. Saturation: calm overall, and much calmer where blue dominates (skies, water, glass).
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    blueness = np.clip((b - np.maximum(r * 0.92, g * 0.96)) * 3.2, 0, 1)
    # Only light blues (sky, water, glass) are touched; dark blues such as uniforms keep their colour.
    blueness = blueness * np.clip((lum - 0.32) / 0.28, 0, 1)
    sat = 0.84 - 0.62 * blueness
    graded = lum[..., None] + (a - lum[..., None]) * sat[..., None]
    # ...and what was blue turns into a warm, sunlit haze rather than grey.
    haze = lum[..., None] * np.array([1.09, 1.02, 0.88], dtype=np.float32)
    graded = graded + (haze - graded) * (blueness * 0.8)[..., None]

    # 2. Tone: lift shadows towards warm brown and roll highlights towards cream.
    graded = SHADOW + graded * (1 - SHADOW) * 0.985
    high = np.clip((lum - 0.62) / 0.38, 0, 1) ** 1.4
    graded = graded + (CREAM - graded) * (high * 0.55)[..., None]

    # 3. Warmth in the midtones.
    mid = (4 * lum * (1 - lum))[..., None]
    graded = graded * (1 + mid * np.array([0.06, 0.018, -0.075], dtype=np.float32))

    # 4. A soft S-curve keeps it from looking washed out.
    graded = np.clip(graded, 0, 1)
    graded = graded + 0.12 * (graded - 0.5) * (1 - np.abs(2 * graded - 1))

    out = a + (np.clip(graded, 0, 1) - a) * strength
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))


def finish(image: Image.Image) -> Image.Image:
    """A light sharpen after downscaling so edges stay crisp on high-density screens."""
    return image.filter(ImageFilter.UnsharpMask(radius=0.8, percent=55, threshold=2))
