(() => {
  const parseTrim = (value = "0.04,0.20,0.03,0.03") => {
    const trim = value.split(",").map(Number);
    if (
      trim.length !== 4 ||
      trim.some((fraction) => !Number.isFinite(fraction) || fraction < 0 || fraction >= 1) ||
      trim[0] + trim[1] >= 1 ||
      trim[2] + trim[3] >= 1
    ) {
      throw new Error(`Invalid data-trim value: "${value}"`);
    }
    return trim;
  };

  const loadStackedImage = (source) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load stacked photo: ${source}`));
      image.src = source;
    });

  const splitCard = async (slider) => {
    const source = slider.dataset.stacked;
    const before = slider.querySelector(".ba-before");
    const after = slider.querySelector(".ba-after");
    if (!source || !before || !after) {
      throw new Error("A stacked slider needs data-stacked, .ba-before, and .ba-after.");
    }

    const [topTrim, bottomTrim, leftTrim, rightTrim] = parseTrim(slider.dataset.trim);
    const image = await loadStackedImage(source);
    const halfHeight = image.naturalHeight / 2;
    if (!image.naturalWidth || !halfHeight || !Number.isInteger(halfHeight)) {
      throw new Error(`Stacked photo must have an even, non-zero height: ${source}`);
    }

    const cropX = Math.round(image.naturalWidth * leftTrim);
    const cropWidth = Math.round(image.naturalWidth * (1 - leftTrim - rightTrim));
    const cropHeight = Math.round(halfHeight * (1 - topTrim - bottomTrim));
    const canvas = document.createElement("canvas");
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create a canvas to split the stacked photo.");
    }

    [before, after].forEach((target, index) => {
      const cropY = Math.round(index * halfHeight + halfHeight * topTrim);
      context.clearRect(0, 0, cropWidth, cropHeight);
      context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      target.src = canvas.toDataURL("image/png");
    });
  };

  document.querySelectorAll(".ba-slider[data-stacked]").forEach((slider) => {
    const range = slider.querySelector(".ba-range");
    const toggle = slider.querySelector(".ba-side-toggle");

    if (range) {
      range.addEventListener("input", () => {
        slider.style.setProperty("--ba-position", `${range.value}%`);
      });
    }

    if (toggle) {
      toggle.addEventListener("click", () => {
        const sideBySide = slider.classList.toggle("is-side-by-side");
        toggle.setAttribute("aria-pressed", String(sideBySide));
      });
    }

    splitCard(slider).catch((error) => {
      console.error("Could not split stacked case photo.", error);
    });
  });
})();
