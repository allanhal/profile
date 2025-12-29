const urlColormind = "http://colormind.io/api/";
const urlVercel = "https://colormind-https.vercel.app/";
const data = {
  model: "default",
};

const exec = async () => {
  iconSync.style.animation = "spin 1s linear";
  setTimeout(() => {
    iconSync.style.animation = "";
  }, 1000);

  let resultJson;
  try {
    const response = await fetch(urlVercel);
    resultJson = await response.json();
  } catch (error) {
    try {
      const response = await fetch(urlColormind, {
        method: "POST",
        body: JSON.stringify(data),
      });
      resultJson = await response.json();
    } catch (error) {}
  }

  if (resultJson) {
    changeColors(resultJson.result);
  }
};

function stringRgb(color) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function changeColors(colorsArray) {
  document.body.style.backgroundColor = stringRgb(colorsArray[0]);

  for (const card of document.getElementsByClassName("card")) {
    card.style.boxShadow = `4px 1px 19px 4px ${stringRgb(colorsArray[2])}`;
  }
  for (const top of document.getElementsByClassName("top")) {
    top.style.backgroundColor = stringRgb(colorsArray[3]);
  }
  for (const divider of document.getElementsByClassName("divider")) {
    divider.style.backgroundColor = stringRgb(colorsArray[3]);
  }
  for (const link of document.getElementsByClassName("preview-link")) {
    link.style.backgroundColor = stringRgb(colorsArray[0]);
  }
}

function changeImage() {
  image.src = image.src.indexOf("profile") >= 0 ? "images/allan.jpg" : "images/profile.jpg";
}
