// Generated sample artwork for catalog demos, so the catalog needs no network
// or binary assets: a dusk sky, a sun, and three ridge lines whose depth makes
// a parallax legible.
export const SKYLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a5c"/><stop offset=".55" stop-color="#c2577a"/><stop offset="1" stop-color="#f4b36b"/></linearGradient>
<radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient></defs>
<rect width="1600" height="900" fill="url(#s)"/>
<circle cx="1080" cy="470" r="220" fill="url(#g)"/><circle cx="1080" cy="470" r="86" fill="#ffe9b0"/>
<path d="M0 560 L180 430 L330 520 L520 360 L700 500 L880 400 L1060 540 L1260 380 L1440 500 L1600 420 V900 H0Z" fill="#7a3f6e"/>
<path d="M0 650 L220 540 L400 620 L600 500 L820 640 L1000 560 L1200 660 L1400 560 L1600 640 V900 H0Z" fill="#4b2a5a"/>
<path d="M0 760 L260 660 L480 740 L720 650 L940 760 L1180 680 L1400 770 L1600 700 V900 H0Z" fill="#241a3d"/>
</svg>`;

// The same scene blurred once, ahead of time: the precomputed asset a
// `BackdropImage` `blur.blurredSrc` cross-fades to, so the page never blurs
// at run time.
export const SKYLINE_BLURRED = SKYLINE.replace(
  '<rect width="1600" height="900" fill="url(#s)"/>',
  '<filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="28"/></filter><g filter="url(#b)"><rect width="1600" height="900" fill="url(#s)"/>',
).replace('</svg>', '</g></svg>');

// A small seamless tile for the repeat form.
export const TILE = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
<rect width="48" height="48" fill="#2f4a7a"/><path d="M0 24 L24 0 L48 24 L24 48Z" fill="#3c5e96"/><circle cx="24" cy="24" r="5" fill="#f4b36b"/>
</svg>`;

// A blob URL rather than a data URL: older kerf releases this package still
// supports screen `data:image/svg+xml` out of every URL attribute; current kerf
// allows it in `<img src>`.
// Created on first render and reused, so re-renders do not leak blob URLs.
const urls = new Map<string, string>();
export const svgUrl = (svg: string) => {
  let url = urls.get(svg);
  if (url === undefined) {
    url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    urls.set(svg, url);
  }
  return url;
};
