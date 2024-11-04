import Image from "next/image";
import { basePath } from "../next.config.js";

const icons = [
  "sunny.svg",
  "partially-sunny.svg",
  "cloudy.svg",
  "rainy.svg",
  "stormy.svg",
];

export const getWeatherIndex = (stat) => {
  let fail_rate = 0;
  fail_rate = (stat["fails"] + stat["skips"]) / stat["runs"];
  // e.g. failing 3/9 runs is .33, or idx=1
  var idx = Math.floor((fail_rate * 10) / 2);
  if (idx == icons.length) {
    // edge case: if 100% failures, then we go past the end of icons[]
    // back the idx down by 1
    console.assert(fail_rate == 1.0);
    idx -= 1;
  }

  // This error checks if there are zero runs.
  // Currently, will display stormy weather.
  if (isNaN(idx)) {
    idx = 4;
  }
  return idx;
};

const getWeatherIcon = (stat) => {
  const idx = getWeatherIndex(stat);
  return icons[idx];
};

export const weatherTemplate = (data) => {
  const icon = getWeatherIcon(data);
  return (
    <div>
      <Image
        src={`${basePath}/${icon}`}
        alt="weather"
        width={32}
        height={32}
        // priority
      />
    </div>
  );
};
