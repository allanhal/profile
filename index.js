var url = "http://colormind.io/api/";
var data = {
  model: "default",
};

const exec = async () => {
  iconSync.style.animation = "spin 1s linear";
  setTimeout(() => {
    iconSync.style.animation = "";
  }, 1000);
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const resultJson = await response.json();
  changeColors(resultJson.result);
};

function stringRgb(color) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function changeColors(colorsArray) {
  document.body.style.backgroundColor = stringRgb(colorsArray[0]);

  for (const card of document.getElementsByClassName("card")) {
    card.style.boxShadow = `4px 1px 19px 4px ${stringRgb(colorsArray[1])}`;
  }
  for (const top of document.getElementsByClassName("top")) {
    top.style.backgroundColor = stringRgb(colorsArray[2]);
  }
  for (const divider of document.getElementsByClassName("divider")) {
    divider.style.backgroundColor = stringRgb(colorsArray[2]);
  }
}
