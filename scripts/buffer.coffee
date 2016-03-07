# Description:
#   Manipulate a line buffer to stage, manipulate, then act on a selection from cached room
#   history, a la the git index.
#
# Commands:
#   hubot buffer help - Show detailed help for buffer manipulation subcommands.
#   hubot buffer add [#channel] [pattern]... - Introduce new lines to the buffer from the history cache.
#   hubot buffer addraw [text] - Add raw text directly to the buffer.
#   hubot buffer remove [numbers] - Remove one or more lines from the buffer by index.
#   hubot buffer replace [number] [text] - Replace a line from your buffer with new contents.
#   hubot buffer show - Show the current contents of your buffer, annotated with indices.
#   hubot buffer clear - Empty your buffer.

MAX_CACHE_SIZE = 200

caches = {}
buffers = {}

class Cache
  constructor: (@room) ->
    @lines = []

  @forRoom: (roomName) -> caches[roomName] ?= new Cache(roomName)

  append: (msg) ->
    now = new Date()
    ls = (new Line(now, msg.message.user.name, line) for line in msg.message.text.split /\n/)
    ls.reverse()

    @lines.unshift ls...
    @lines = @lines.slice(0, MAX_CACHE_SIZE)

  mostRecentMatch: (pattern) -> @lines.find (line) -> pattern.matches(line)

  between: (startPattern, endPattern) ->
    results = []
    inMatch = false
    for line in @lines
      if inMatch
        results.push line
        if startPattern.matches(line)
          inMatch = false
          break
        continue

      if endPattern.matches(line)
        results.push line
        inMatch = true
        continue

    return undefined if inMatch or results.length is 0

    results.reverse()
    results

  earliest: -> @lines.slice(-1)[0]

class Line
  constructor: (@timestamp, @speaker, @text) ->

  isRaw: -> !@speaker?

  toString: -> if @isRaw() then @text else "#{@speaker}: #{@text}"

class ExactPattern
  constructor: (@source) ->

  previousPattern: ->

  matches: (line) -> line.text.indexOf(@source) isnt -1

  matchesIn: (cache) ->
    m = cache.mostRecentMatch(this)
    [m] if m?

  canBeEndpoint: -> true

  validate: ->

  toString: -> "\"#{@source}\""

class RegexpPattern
  constructor: (source) ->
    @rx = new RegExp(source, 'i')

  matches: (line) -> @rx.test line.text

  matchesIn: (cache) ->
    m = cache.mostRecentMatch(this)
    [m] if m?

  canBeEndpoint: -> true

  validate: ->

  toString: -> @rx.toString()

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

  validate: ->
    throw new Error("Range without a start pattern") unless @startPattern?
    throw new Error("Range without an end pattern") unless @endPattern?

  toString: -> "#{@startPattern} ... #{@endPattern}"

class UserBuffer
  constructor: (@owner) ->
    @contents = []

  @forUser: (userName) -> buffers[userName] ?= new UserBuffer(userName)

  isValidIndex: (index) -> index >= 0 and index < @contents.length

  append: (lines) ->
    @contents = @contents.concat(lines)

  remove: (index) -> @contents.splice(index, 1)

  replace: (index, newLines) -> @contents.splice(index, 1, newLines...)

  clear: -> @contents = []

  show: ->
    if @contents.length is 0
      return "Your buffer is currently empty."
    ("_(#{i})_ #{@contents[i]}" for i in [0...@contents.length]).join "\n"

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

  showIfDirect = (msg, buffer) ->
    if msg.message.rawMessage?.getChannelType() is "DM"
      msg.send buffer.show()

  plural = (name, array) ->
    s = if array.length isnt 1 then "s" else ""
    "#{array.length} #{name}#{s}"

  numbersFrom = (text) ->
    results = []
    text.replace /\d+/g, (m) ->
      results.push Number(m)
    results

  # Accumulate Lines into the history buffer for each room.
  robot.catchAll (msg) ->
    return unless msg.message.text

    Cache.forRoom(msg.message.room).append(msg)

  robot.respond /buffer\s+help/i, (msg) ->
    msg.reply "The \"buffer\" commands allow you to stage and manipulate lines of text taken from
    the history of a channel before using them with a different command."

  robot.respond /buffer\s+add (#\S+)?([^]*)/i, (msg) ->
    room = msg.match[1] or msg.message.room
    try
      patterns = readPatterns msg.match[2]
      p.validate() for p in patterns

      cache = Cache.forRoom room
      buffer = UserBuffer.forUser msg.message.user.name

      lines = []
      for p in patterns
        matches = p.matchesIn cache

        unless matches?
          earliest = cache.earliest()
          m = if earliest? then "The earliest line I have is \"#{earliest}\"." else "I haven't cached any lines yet."

          msg.reply "No lines matched by the pattern #{p}.\n#{m}"
          return

        lines = lines.concat(matches)

      buffer.append lines
      msg.reply "Added #{plural 'line', lines} to your buffer."
      showIfDirect msg, buffer
    catch e
      console.error e.stack
      msg.reply ":no_entry_sign: #{e.message}\n
        Consult #{helpCommand msg} for a pattern syntax reference."
      return

  robot.respond /buffer\s+addraw\s*([^]+)/i, (msg) ->
    now = new Date();
    lines = (new Line(now, null, each) for each in msg.match[1].split /\n/)
    UserBuffer.forUser(msg.message.user.name).append(lines)

    msg.reply "Added #{plural 'line', lines} to your buffer."
    showIfDirect msg, buffer

  robot.respond /buffer\s+remove\s*([\d\s\r\n]+)/i, (msg) ->
    buffer = UserBuffer.forUser(msg.message.user.name)

    indices = numbersFrom msg.match[1]
    for i in indices
      unless buffer.isValidIndex i
        msg.reply ":no_entry_sign: #{i} is not a valid buffer index."
        return

    buffer.remove(i) for i in indices

    msg.reply "Removed #{indices.length} buffer entr#{if indices.length is 1 then "y" else "ies"}."
    showIfDirect msg, buffer

  robot.respond /buffer\s+replace\s*(\d+)\s*([^]+)/i, (msg) ->
    buffer = UserBuffer.forUser(msg.message.user.name)

    index = Number(msg.match[1])
    unless buffer.isValidIndex index
      msg.reply ":no_entry_sign: #{index} is not a valid buffer index."
      return

    now = new Date();
    lines = (new Line(now, null, each) for each in msg.match[2].split /\n/)

    buffer.replace(index, lines)
    msg.reply "Replaced buffer entry #{index} with #{plural 'line', lines}."
    showIfDirect msg, buffer

  robot.respond /buffer\s+show/i, (msg) ->
    msg.send UserBuffer.forUser(msg.message.user.name).show()

  robot.respond /buffer\s+clear/i, (msg) ->
    UserBuffer.forUser(msg.message.user.name).clear()
    msg.reply "Buffer forgotten."
