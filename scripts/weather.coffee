# Description:
#   Look up weather information
#
# Commands:
#
#   hubot weather <location> - look up weather at location (in google-understandable format)
#
# Configuration:
#
# HUBOT_GEOCODING_APIKEY = Google Maps API key
# HUBOT_WEATHER_APIKEY = forecast.io api key
#

tinycolor = require 'tinycolor2'


MIN_TEMP = 10
MAX_TEMP = 120

colors = 
  120: tinycolor("#FF00FF"),
  100: tinycolor("#FF0000"),
  90: tinycolor("#FF9200"),
  80: tinycolor("#FFFF00"),
  70: tinycolor("#A1FF00"),
  60: tinycolor("#00FF00"),
  50: tinycolor("#00A53A"),
  40: tinycolor("#00FFFF"),
  10: tinycolor("#0000FF")

tempToColor = (temp) ->
  if temp > MAX_TEMP
    return colors[MAX_TEMP].toHexString()
  if temp < MIN_TEMP
    return colors[MIN_TEMP].toHexString()
  lowBound = MIN_TEMP
  highBound = MAX_TEMP
  for checkTemp, checkColor of colors
    if temp > checkTemp
      lowBound = Math.max lowBound, checkTemp
    if temp < checkTemp
      highBound = Math.min highBound, checkTemp
  temperatureBlend = (temp - lowBound) / (highBound - lowBound) * 100.0
  tinycolor.mix(colors[lowBound], colors[highBound], temperatureBlend).toHexString()

iconToEmoji = (icon) ->
  switch icon
    when 'clear-day' then 'sunny'
    when 'clear-night' then 'clear_night'
    when 'rain' then 'umbrella'
    when 'snow' then 'snowflake'
    when 'sleet' then 'sleet'
    when 'wind' then 'windy'
    when 'fog' then 'foggy'
    when 'cloudy' then 'cloud'
    when 'partly-cloudy-day' then 'partly_sunny'
    when 'partly-cloudy-night' then 'partly_cloudy_night'
    else 'shrug'

module.exports = (robot) ->

  robot.respond /weather *(.+)/i, (msg) ->
    location = escape(msg.match[1])
    mapsApiKey = process.env.HUBOT_GEOCODING_APIKEY
    url = "https://maps.googleapis.com/maps/api/geocode/json?address=#{location}&key=#{mapsApiKey}"
    msg.http(url).get() (err, res, body) ->
      msg.send err if err
      try
        json = JSON.parse(body)
        if json.status isnt "OK"
          msg.send "Error geocoding location: `#{json.status}`"
          return
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
          
          currentlyEmoji = iconToEmoji json.currently.icon
          todayEmoji = iconToEmoji json.daily.data[0].icon
          tomorrowEmoji = iconToEmoji json.daily.data[1].icon

          attachment =
            fallback: "Dark Sky weather forecast"
            color: tempToColor json.currently.temperature
            title: "Forecast for #{address}"
            title_url: "https://darksky.net/#{lat},#{lng}"
            fields: [
              { title: "Currently", value: "#{json.minutely.summary} #{json.currently.temperature} °F, feels like #{json.currently.apparentTemperature} °F. :#{currentlyEmoji}:" }
              { title: "Today", value: "#{json.daily.data[0].summary} High: #{json.daily.data[0].temperatureMax} °F Low: #{json.daily.data[0].temperatureMin} °F. :#{todayEmoji}:" }
              { title: "Tomorrow", value: " #{json.daily.data[1].summary} High: #{json.daily.data[1].temperatureMax} °F Low: #{json.daily.data[1].temperatureMin} °F. :#{tomorrowEmoji}:"}
            ]
            footer: "Powered by Dark Sky | https://darksky.net/poweredby/"

          for alert in (json.alerts or [])
              attachment.fields.push
                title: "#{alert.title}"
                value: "<#{alert.uri}|details>"

          msg.send({attachments: [attachment]})
        catch error
          msg.send "Failed to retrieve forecast.\n#{error}"
