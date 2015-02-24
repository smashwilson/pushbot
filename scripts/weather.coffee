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
module.exports = (robot) ->

  robot.respond /weather *(.+)/i, (msg) ->
    location = msg.match[1]
    q = address: '#{location}'
    url = "https://maps.googleapis.com/maps/api/geocode/json?address=#{location}"
    msg.http(url).get() (err, res, body) ->
      errmsg = "Couldn't download/parse/whatever that"
      msg.send err if err
      try
        json = JSON.parse(body)
        lat = json.results[0].geometry.location.lat
        lng = json.results[0].geometry.location.lng
      catch error
        msg.send "Error parsing location"
        msg.send error
        lat = 0
        lng = 0
      apikey = process.env.HUBOT_WEATHER_APIKEY
      forecasturl = "https://api.forecast.io/forecast/#{apikey}/#{lat},#{lng}"
      msg.http(forecasturl).get() (err, res, body) ->
        msg.send err if err
        json = JSON.parse(body)
        msg.send "#{json.currently.summary}, #{json.currently.temperature}°F, feels like #{json.currently.apparentTemperature}°F"
      
      