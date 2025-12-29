// ===== Color Theory Palette Generator =====

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {number[]} RGB array [r, g, b]
 */
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r, g, b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Generate a color palette using color theory harmonies
 * @returns {number[][]} Array of 5 RGB color arrays
 */
function generateColorPalette() {
  // Random base hue (0-360)
  const baseHue = Math.floor(Math.random() * 360);

  // Random saturation (40-80% for pleasing colors)
  const baseSaturation = 40 + Math.floor(Math.random() * 40);

  // Harmony types: complementary, analogous, triadic, split-complementary, tetradic
  const harmonies = ["complementary", "analogous", "triadic", "split-complementary", "tetradic"];
  const harmony = harmonies[Math.floor(Math.random() * harmonies.length)];

  let hues = [];

  switch (harmony) {
    case "complementary":
      // Base + opposite (180°)
      hues = [baseHue, baseHue, (baseHue + 180) % 360, (baseHue + 180) % 360, baseHue];
      break;
    case "analogous":
      // Adjacent colors (30° apart)
      hues = [baseHue, (baseHue + 30) % 360, (baseHue + 60) % 360, (baseHue - 30 + 360) % 360, (baseHue - 60 + 360) % 360];
      break;
    case "triadic":
      // Evenly spaced (120° apart)
      hues = [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360, (baseHue + 120) % 360, baseHue];
      break;
    case "split-complementary":
      // Base + two colors adjacent to complement
      hues = [baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360, (baseHue + 150) % 360, baseHue];
      break;
    case "tetradic":
      // Rectangle on color wheel (60° and 180°)
      hues = [baseHue, (baseHue + 60) % 360, (baseHue + 180) % 360, (baseHue + 240) % 360, baseHue];
      break;
  }

  // Generate palette with varying lightness for contrast
  // [background, accent1, shadow, top/divider, link-bg]
  const lightnessValues = [25, 45, 35, 55, 30]; // Dark theme friendly

  return hues.map((hue, index) => {
    // Add slight saturation variation
    const sat = baseSaturation + (Math.random() * 20 - 10);
    return hslToRgb(hue, Math.max(20, Math.min(90, sat)), lightnessValues[index]);
  });
}

const exec = () => {
  iconSync.style.animation = "spin 1s linear";
  setTimeout(() => {
    iconSync.style.animation = "";
  }, 1000);

  const palette = generateColorPalette();
  changeColors(palette);
};

function stringRgb(color) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function changeColors(colorsArray) {
  // document.body.style.backgroundColor = stringRgb(colorsArray[0]);
  // document.getElementsByClassName("main")[0].style.backgroundColor = stringRgb(colorsArray[0]);

  for (const card of document.getElementsByClassName("card")) {
    // card.style.boxShadow = `2px 1px 10px 2px ${stringRgb(colorsArray[2])}`;
  }
  for (const top of document.getElementsByClassName("top")) {
    top.style.backgroundColor = stringRgb(colorsArray[3]);
  }
  for (const divider of document.getElementsByClassName("divider")) {
    divider.style.backgroundColor = stringRgb(colorsArray[3]);
  }
  for (const link of document.getElementsByClassName("preview-link")) {
    link.style.backgroundColor = stringRgb(colorsArray[3]);
  }
}

function changeImage() {
  image.src = image.src.indexOf("profile") >= 0 ? "images/allan.jpg" : "images/profile.jpg";
}
