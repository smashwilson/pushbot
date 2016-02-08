# Description:
#   Look up words in the dictionary.
#
# Commands:
#   hubot urbandefine <word> - Look up a word on urban dictionary.
#   hubot define <word> - Look up a word on Merriam-Webster's online dictionary.

cheerio = require 'cheerio'
request = require 'request'

scrub = (txt) ->
  txt = txt.replace /^[ \t\n]+/, ''
  txt = txt.replace /[ \t\n]+$/, ''
  txt

module.exports = (robot) ->

  robot.respond /define +([^]+)/i, (res) ->
    term = encodeURIComponent(res.match[1])

    request "http://www.merriam-webster.com/dictionary/" + term, (err, resp, body) ->
      if err
        res.send "THE INTERNET IS BROKEN file a ticket #{err}"
        return

      if resp.statusCode isnt 200
        res.send "Merriam Webster hates us right now: #{resp.statusCode}"
        return

      $ = cheerio.load body

      $(".definition-inner-item.with-sense").each (i, element) ->
        if i <= 5
          txt = scrub $(element).text()
          res.send "> #{txt}"

  robot.respond /urbandefine +([^]+)/i, (res) ->
    opts =
      url: "http://www.urbandictionary.com/define.php"
      qs:
        term: res.match[1]

    request opts, (err, resp, body) ->
      if err
        res.send "THE INTERNET IS BROKEN file a ticket #{err}"
        return

      if resp.statusCode isnt 200
        res.send "Urban Dictionary hates us right now: #{resp.statusCode}"
        return

      $ = cheerio.load body

      definition = scrub $(".meaning").eq(0).text()
      res.send "> #{definition}"

      example = scrub $(".example").eq(0).text()
      res.send "\"_#{example}_\""
