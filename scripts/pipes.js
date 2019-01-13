// Description:
//   Pipe-friendly utilities and silly things intended to be used with command piping.
//
// Commands:
//   hubot elcor - Helpfully: repeat lines of speech in their native Elcor.
//   hubot hk47 - Query: why don't you try it and find out, meatbag?

module.exports = function (robot) {
  const EMOTIONS = [
    'Aghast',
    'Airing of grievance',
    'Angry',
    'Annoyed',
    'Antagonistic',
    'Apathetically',
    'Argumentitavely',
    'Badassfully',
    'Badgering',
    'Barely suppressed rage',
    'Contritely',
    'Coy aside',
    'Deep regret',
    'Diplomatically',
    'Derisively',
    'Disgust',
    'Disinterest',
    'Embarassment',
    'Ennui',
    'Enthusiastically',
    'Euphemistically',
    'Existential Angst',
    'Exploding with bees',
    'Feigned interest',
    'Grudging respect',
    'Guiltily',
    'Hastily',
    'Hungrily',
    'Inebriated',
    'Innuendo',
    'Insincerely',
    'Instant sexual attraction',
    'Irritated',
    'Lustfully',
    'Matter-of-factly',
    'Non sequitur',
    'Obvious insincerity',
    'Overly interested',
    'Overstatement',
    'Poorly concealed lie',
    'Poorly thought out',
    'Puzzled',
    'Rehearsed speech',
    'Revolted',
    'Rhetorically',
    'Sarcastically',
    'Sign language',
    'Sincerely',
    'Understatement',
    'Underwhelmed',
    'Utter sincerity'
  ]

  robot.respond(/elcor\s*([^]*)/i, function (msg) {
    const message = msg.match[1].trim().length > 0 ? msg.match[1] : robot.mostRecentText(msg)

    const adjectives = EMOTIONS

    const output = []
    for (let line of Array.from(message.split(/\n/))) {
      if (line.match(/\S/)) {
        output.push(`${msg.random(adjectives)}: ${line}`)
      }
    }
    msg.send(output.join('\n'))
  })

  return robot.respond(/hk47\s*([^]*)/i, function (msg) {
    const message = msg.match[1].trim().length > 0 ? msg.match[1] : robot.mostRecentText(msg)

    const adjectives = [
      'Translation',
      'Definition',
      'Mockery',
      'Statement',
      'Observation',
      'Retraction',
      'Explanation',
      'Suggestion',
      'Expletive',
      'Judgement',
      ...EMOTIONS
    ]

    const output = []
    for (let line of message.split(/\n/)) {
      if (line.match(/\S/)) {
        output.push(`${msg.random(adjectives)}: ${line.replace(/[.!?,]$/, '')}, meatbag`)
      }
    }
    msg.send(output.join('\n'))
  })
}
