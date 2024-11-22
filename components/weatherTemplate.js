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
  fail_rate = (stat["fails"]) / stat["runs"];
  // e.g. failing 3/9 runs is .33, or idx=1
  var idx = Math.floor((fail_rate * 10) / 2);
  if (idx == icons.length) {
    // edge case: if 100% failures, then we go past the end of icons[]
    // back the idx down by 1
    idx -= 1;
  }

  // This error checks if there are zero runs.
  // Currently, will display stormy weather.
  if (isNaN(idx) || idx > icons.length) {
    idx = 4;
  }
  return idx;
};

export const weatherTemplate = (data) => {
  return (
    <div>
      <Image
        src={`${basePath}/${icons[getWeatherIndex(data)]}`}
        alt="weather"
        width={32}
        height={32}
        // priority
      />
    </div>
  );
};
