// Description:
//   Look up weather information
//
// Commands:
//
//   hubot weather <location> - look up weather at location (in google-understandable format)
//
// Configuration:
//
// HUBOT_GEOCODING_APIKEY = Google Maps API key
// HUBOT_WEATHER_APIKEY = forecast.io api key
//

const fetch = require("node-fetch");
const tinycolor = require("tinycolor2");

const MAPS_APIKEY = process.env.HUBOT_GEOCODING_APIKEY;
const FORECAST_APIKEY = process.env.HUBOT_WEATHER_APIKEY;

const MIN_TEMP = 10;
const MAX_TEMP = 120;

const colors = new Map([
  [120, tinycolor("#FF00FF")],
  [100, tinycolor("#FF0000")],
  [90, tinycolor("#FF9200")],
  [80, tinycolor("#FFFF00")],
  [70, tinycolor("#A1FF00")],
  [60, tinycolor("#00FF00")],
  [50, tinycolor("#00A53A")],
  [40, tinycolor("#00FFFF")],
  [10, tinycolor("#0000FF")],
]);

function tempToColor(temp) {
  if (temp > MAX_TEMP) {
    return colors.get(MAX_TEMP).toHexString();
  }

  if (temp < MIN_TEMP) {
    return colors.get(MIN_TEMP).toHexString();
  }

  let lowBound = MIN_TEMP;
  let highBound = MAX_TEMP;
  for (const checkTemp of colors.keys()) {
    if (temp > checkTemp) {
      lowBound = Math.max(lowBound, checkTemp);
    }
    if (temp < checkTemp) {
      highBound = Math.min(highBound, checkTemp);
    }
  }
  const temperatureBlend = ((temp - lowBound) / (highBound - lowBound)) * 100.0;
  return tinycolor
    .mix(colors.get(lowBound), colors.get(highBound), temperatureBlend)
    .toHexString();
}

function iconToEmoji(icon) {
  switch (icon) {
    case "clear-day":
      return "sunny";
    case "clear-night":
      return "clear_night";
    case "rain":
      return "umbrella";
    case "snow":
      return "snowflake";
    case "sleet":
      return "sleet";
    case "wind":
      return "windy";
    case "fog":
      return "foggy";
    case "cloudy":
      return "cloud";
    case "partly-cloudy-day":
      return "partly_sunny";
    case "partly-cloudy-night":
      return "partly_cloudy_night";
    default:
      return "shrug";
  }
}

module.exports = function (robot) {
  robot.respond(/weather *(.+)/i, async function (msg) {
    try {
      const location = encodeURIComponent(msg.match[1]);
      const geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${location}&key=${MAPS_APIKEY}`;

      const response = await fetch(geocodeURL, {
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        const text = await response.text();
        msg.send(
          `Error geocoding location:\n${response.status} ${response.statusText}\n\`\`\`\n${text}\n\`\`\`\n`
        );
        return;
      }

      const geocodeResult = await response.json();
      if (geocodeResult.status !== "OK") {
        msg.send(`Error geocoding location: \`${geocodeResult.status}\``);
        return;
      }

      const {lat, lng} = geocodeResult.results[0].geometry.location;
      const address = geocodeResult.results[0].formatted_address;

      const forecastURL = `https://api.darksky.net/forecast/${FORECAST_APIKEY}/${lat},${lng}`;
      const forecastResponse = await fetch(forecastURL, {
        headers: {
          Accept: "application/json",
        },
      });
      if (!forecastResponse.ok) {
        const text = await forecastResponse.text();
        msg.send(
          `Error accessing forecast:\n${forecastResponse.status} ${forecastResponse.statusText}\n\`\`\`\n${text}\n\`\`\`\n`
        );
        return;
      }

      const forecastResult = await forecastResponse.json();

      const currentlyEmoji = iconToEmoji(forecastResult.currently.icon);
      const todayEmoji = iconToEmoji(forecastResult.daily.data[0].icon);
      const tomorrowEmoji = iconToEmoji(forecastResult.daily.data[1].icon);

      const attachment = {
        fallback: "Dark Sky weather forecast",
        color: tempToColor(forecastResult.currently.temperature),
        title: `Forecast for ${address}`,
        title_url: `https://darksky.net/${lat},${lng}`,
        fields: [
          {
            title: "Currently",
            value: `${forecastResult.minutely.summary} ${forecastResult.currently.temperature} °F, feels like ${forecastResult.currently.apparentTemperature} °F. :${currentlyEmoji}:`,
          },
          {
            title: "Today",
            value: `${forecastResult.daily.data[0].summary} High: ${forecastResult.daily.data[0].temperatureMax} °F Low: ${forecastResult.daily.data[0].temperatureMin} °F. :${todayEmoji}:`,
          },
          {
            title: "Tomorrow",
            value: ` ${forecastResult.daily.data[1].summary} High: ${forecastResult.daily.data[1].temperatureMax} °F Low: ${forecastResult.daily.data[1].temperatureMin} °F. :${tomorrowEmoji}:`,
          },
        ],
        footer: "Powered by Dark Sky | https://darksky.net/poweredby/",
      };

      for (const alert of forecastResult.alerts || []) {
        attachment.fields.push({
          title: `${alert.title}`,
          value: `<${alert.uri}|details>`,
        });
      }

      msg.send({attachments: [attachment]});
    } catch (err) {
      msg.send(`:boom:\n\`\`\`\n${err.stack || err}\n\`\`\`\n`);
    }
  });
};
