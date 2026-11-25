# Photographer portfolio

Run `npm ci` and `npm start` in this directory, then open http://127.0.0.1:8000/. The implementation and artwork are local; JavaScript dependencies are installed from the pinned npm lockfile. No build is required.

Implemented the black spinner and lens pullback introduction; a detailed procedural Three.js camera; scroll-driven 180-degree rotation into its rear display; three local illustrated landscape series; spatial shader wipes between project images and blurred background crossfades; a top-down contact finish; and project click / zoom / full-screen article / floating return transitions. Navigation dots, email link, Escape-to-close, mobile framing, and keyboard-accessible project buttons are included.

The landscape images are original local SVG illustrations used as stand-in portfolio artwork, rather than photographs. The camera is constructed from procedural geometry, without an imported product model.

Validation: Chromium / Playwright confirmed that the scene loads without JavaScript errors, scrolling reaches a project, the story button opens the article, and the floating back button restores the project. Desktop and mobile previews are in `../renders/`. This implementation uses Three.js 0.160.1 and GSAP 3.12.5 from its own npm dependencies.
