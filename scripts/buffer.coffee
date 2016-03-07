# Description:
#   Manipulate a line buffer to stage, manipulate, then act on a selection from cached room
#   history, a la the git index.
#
# Commands:
#   hubot buffer help - Show detailed help for buffer manipulation subcommands.
#   hubot buffer add [#channel] [pattern]... - Introduce new lines to the buffer.
#   hubot buffer remove [numbers] - Remove one or more lines from the buffer by index.
#   hubot buffer replace [number] [text] - Replace a line from your buffer with new contents.
#   hubot buffer show - Show the current contents of your buffer, annotated with indices.
#   hubot buffer clear - Empty your buffer.

MAX_CACHE_SIZE = 200

cache = {}

class Cache
  constructor: (@room) ->
    @lines = []

  @forRoom: (room) -> cache[room] ?= new Cache(room)

  append: (msg) ->
    now = new Date()
    ls = (new Line(now, msg.message.user.name, line) for line in msg.message.text.split /\n/)
    ls.reverse()

    @lines.unshift ls...
    @lines = @lines.slice(0, MAX_CACHE_SIZE)

  mostRecentMatch: (pattern) -> @lines.find (line) -> pattern.match(line)

  between: (startPattern, endPattern) ->
    results = []
    inMatch = false
    for line in @lines
      if inMatch
        results.push line
        if endPattern.matches(line)
          inMatch = false
          break
        continue

      if startPattern.matches(line)
        results.push line
        inMatch = true
        continue

    results

class Line
  constructor: (@timestamp, @speaker, @text) ->

class ExactPattern
  constructor: (@source) ->

  previousPattern: ->

  matches: (line) -> line.text.indexOf(@source) isnt -1

  matchesIn: (cache) -> cache.mostRecentMatch(this)

  canBeEndpoint: -> true

  toString: -> "Exact[#{@source}]"

class RegexpPattern
  constructor: (source) ->
    @rx = new RegExp(source, 'i')

  matches: (line) -> @rx.test line.text

  matchesIn: (cache) -> cache.mostRecentMatch(this)

  canBeEndpoint: -> true

  toString: -> "Regexp[#{@rx}]"

class BetweenPattern
  constructor: ->

  endpoints: (@startPattern, @endPattern) ->
    throw new Error("Range without a start pattern") unless @startPattern?
    throw new Error("#{@startPattern} cannot be a range endpoint") unless @startPattern.canBeEndpoint()
    throw new Error("Range without an end pattern") unless @endPattern?
    throw new Error("#{@endPattern} cannot be a range endpoint") unless @endPattern.canBeEndpoint()

  needsEndpoints: -> !@startPattern? or !@endPattern?

  matchesIn: (cache) -> cache.between(@startPattern, @endPattern)

  canBeEndpoint: -> false

  toString: -> "Between[#{@startPattern}...#{@endPattern}]"

readPatterns = (source) ->
  source = source.replace /^\s*/, ""

  return [] if source.length is 0

  # On ..., construct a BetweenPattern with the start and end patterns.
  if /^\.{2,}/.test source
    rest = source.replace /^\.+/, ""
    patterns = [new BetweenPattern()]
    return patterns.concat readPatterns(rest)

  delimiter = source[0]
  PatternClass = switch delimiter
    when '"' then ExactPattern
    when '/' then RegexpPattern
    else throw new Error("Unexpected pattern delimiter: #{delimiter}")

  if source.length is 1
    throw new Error("Unbalanced pattern delimiter: #{delimiter}")

  result = ""
  isEscaped = false
  wasDelimited = false
  for i in [1...source.length]
    ch = source[i]
    if isEscaped
      result += ch
      isEscaped = false
      continue
    if ch is "\\"
      isEscaped = true
      continue
    if ch is delimiter
      i += 1
      wasDelimited = true
      break
    result += ch

  unless wasDelimited
    throw new Error("Unbalanced pattern delimiter: #{delimiter}")

  patterns = [new PatternClass(result)]
  if i isnt source.length
    rest = readPatterns(source.slice(i))

    if rest[0] instanceof BetweenPattern and rest[0].needsEndpoints()
      rest[0].endpoints patterns[0], rest[1]
      rest.splice(1, 1)
      return rest

    patterns.concat(rest)
  else
    patterns

module.exports = (robot) ->

  helpCommand = (msg) ->
    if msg.message.rawMessage?.getChannelType() is "DM"
      "`buffer help`"
    else
      "`#{robot.name} buffer help`"

  # Accumulate Lines into the history buffer for each room.
  robot.catchAll (msg) ->
    return unless msg.message.text

    Cache.forRoom(msg.message.room).append(msg)

  robot.respond /buffer\s+help/i, (msg) ->
    msg.reply """The "buffer" commands allow you to stage and manipulate lines of text taken from
the history of a channel before using them with a different command.
    """

  robot.respond /buffer\s+add (#\S+)?([^]*)/i, (msg) ->
    room = msg.match[1] or msg.message.room
    try
      patterns = readPatterns msg.match[2]

      msg.reply "room = `#{room}`"
      msg.reply "patterns = `#{patterns}`"
    catch e
      msg.reply ":no_entry_sign: #{e.message}\n
        Consult #{helpCommand msg} for a pattern syntax reference."
      return
