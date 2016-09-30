# Description:
#   Look up weather information
#
# Commands:
#
#   hubot weather <location> - look up weather at location (in google-understandable format)
#
# Configuration:
#
# HUBOT_WEATHER_APIKEY = forecast.io api key
#

tinycolor = require 'tinycolor2'

COOL_COLOR = tinycolor("#aaf4fc")
COOL_TEMP = 32

HOT_COLOR = tinycolor("#fc5427")
HOT_TEMP = 80

module.exports = (robot) ->

  robot.respond /weather *(.+)/i, (msg) ->
    location = escape(msg.match[1])
    url = "https://maps.googleapis.com/maps/api/geocode/json?address=#{location}"
    msg.http(url).get() (err, res, body) ->
      msg.send err if err
      try
        json = JSON.parse(body)
        lat = json.results[0].geometry.location.lat
        lng = json.results[0].geometry.location.lng
        address = json.results[0].formatted_address
      catch error
        msg.send "Error parsing location: `#{error}`"
        return
      apikey = process.env.HUBOT_WEATHER_APIKEY
      forecasturl = "https://api.darksky.net/forecast/#{apikey}/#{lat},#{lng}"
      msg.http(forecasturl).get() (err, res, body) ->
        msg.send err if err
        try
          json = JSON.parse(body)

          temperatureBlend = (json.currently.temperature - COOL_TEMP) / (HOT_TEMP - COOL_TEMP) * 100.0

          attachment =
            fallback: "Dark Sky weather forecast"
            color: tinycolor.mix(COOL_COLOR, HOT_COLOR, temperatureBlend).toHexString()
            title: "Forecast for #{address}"
            title_url: "https://darksky.net/#{lat},#{lng}"
            fields: [
              { title: "Currently", value: "#{json.minutely.summary} #{json.currently.temperature} °F, feels like #{json.currently.apparentTemperature} °F." }
              { title: "Today", value: "#{json.daily.data[0].summary} High: #{json.daily.data[0].temperatureMax} °F Low: #{json.daily.data[0].temperatureMin} °F" }
              { title: "Tomorrow", value: " #{json.daily.data[1].summary} High: #{json.daily.data[1].temperatureMax} °F Low: #{json.daily.data[1].temperatureMin} °F"}
            ]
            footer: "Powered by Dark Sky | https://darksky.net/poweredby/"

          for alert in (json.alerts or [])
              attachment.fields.push
                title: "#{alert.title}"
                value: "<#{alert.uri}|details>"

          msg.send({attachments: [attachment]})
        catch error
          msg.send "Failed to retrieve forecast.\n#{error}"
