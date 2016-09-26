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

          attachment =
            fallback: "Dark Sky weather forecast"
            color: "#4e7ef9"
            title: "Forecast for #{address}"
            title_url: "https://darksky.net/#{lat},#{lng}"
            fields: [
              { title: "Currently", value: "#{json.currently.summary}, #{json.currently.temperature} °F, feels like #{json.currently.apparentTemperature} °F. #{json.minutely.summary}" }
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
