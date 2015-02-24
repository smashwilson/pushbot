# Description:
#   Look up weather information
#
# Commands:
#
#   hubot weather <location> - look up weather at location (in google-understandable format)
#
# Configuration:
#
# HUBOT_WEATHER_LOOKUP - URL to look up the weather
# HUBOT_LATLON_LOOKUP - URL to look up the lat/long of locations

module.exports = (robot) ->

  robot.respond /hspopulate(?: (.*))?/i, (msg) ->
    url = msg.match[1] or "http://hearthstonejson.com/json/AllSets.json"
    msg.http(url).get() (err, res, body) ->
      errmsg = "Couldn't download/parse/whatever that"
      msg.send err if err
      try
        json = JSON.parse(body)
        robot.brain.data.hearthstone = {}
        for set of json
          for card in json[set]
            # Debug cards have IDs that start with XXX
            # Not the much anticipated pornographic expansion, alas
            if card.id[0..3] != "XXX_"
              robot.brain.data.hearthstone[card.name.toLowerCase()] = card
        msg.send "Hearthstone population complete"
      catch error
        msg.send errmsg
        msg.send error
        return

  robot.respond /weather *(.+)/i, (msg) ->
    location = msg.match[1]
    q = address: '#{location}'
    url = "https://maps.googleapis.com/maps/api/geocode/json?address="
    msg.http(url).query(q).get() (err, res, body) ->
      errmsg = "Couldn't download/parse/whatever that"
      msg.send err if err
      try
        json = JSON.parse(body)
        lat = json.results[0].geometry.location.lat
        lng = json.results[0].geometry.location.lng
        msg.send "#{lat} #{lng}"
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
        msg.send "#{json.currently.time}"
        for r in json
          msg.send "#{r}"
      
      