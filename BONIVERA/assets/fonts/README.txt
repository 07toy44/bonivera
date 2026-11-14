Fonts are loaded from Google Fonts (Fraunces + Plus Jakarta Sans) via a CDN
`@import` at the top of assets/css/shared.css, so nothing needs to live in
this folder for the site to work — a solid system-font fallback is also
defined in case the CDN is unreachable.

To self-host instead (e.g. for a fully offline deployment):
1. Download the two font families as .woff2 files into this folder.
2. Remove the @import line at the top of assets/css/shared.css.
3. Add @font-face rules here pointing at the local files, using the same
   family names already referenced by --font-display and --font-body.
