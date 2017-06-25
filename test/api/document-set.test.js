const {createDocumentSet} = require('../../scripts/documentset')
const DocumentSetResolver = require('../../scripts/api/document-set')

describe('DocumentSetResolver', function () {
  let set, resolver

  beforeEach(function () {
    usesDatabase(this)

    const robot = {
      postgres: database
    }

    set = createDocumentSet(robot, 'blork', {})
    resolver = new DocumentSetResolver('blork', set)
  })

  afterEach(async function () {
    await set.destroy()
  })

  async function populate (...specs) {
    const promises = []
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i]
      const body = spec.body || `entry #${i}`
      const attrs = []
      if (spec.subject) {
        attrs.push({kind: 'subject', value: spec.subject})
      }
      if (spec.speakers) {
        attrs.push(...spec.speakers.map(speaker => {
          return {kind: 'speaker', value: speaker}
        }))
      }
      if (spec.mentions) {
        attrs.push(...spec.mentions.map(mention => {
          return {kind: 'mention', value: mention}
        }))
      }

      promises.push(set.add('spec', body, attrs))
    }
    await Promise.all(promises)
  }

  describe('random', function () {
    it('with no documents', async function () {
      const result = await resolver.random({criteria: {}})
      expect(result.found).to.equal(false)
    })

    it('with empty criteria', async function () {
      await populate({body: 'one'})

      const result = await resolver.random({criteria: {}})
      expect(result.found).to.equal(true)
    })

    it('matching a query', async function () {
      await populate(
        {}, {}, {}, {}, {},
        {body: 'one aaa one'},
        {}, {}, {}, {}, {}
      )

      const result = await resolver.random({criteria: {query: 'aaa'}})
      expect(result.found).to.equal(true)
      expect(result.text).to.equal('one aaa one')
    })

    it('with a matching subject', async function () {
      await populate(
        {}, {}, {}, {}, {},
        {body: 'this one', subject: 'me'},
        {subject: 'other'}, {subject: 'other'},
        {}, {}, {}, {}, {}
      )

      const result = await resolver.random({criteria: {subject: 'me'}})
      expect(result.found).to.equal(true)
      expect(result.text).to.equal('this one')
    })

    it('with all speakers', async function () {
      await populate(
        {}, {}, {}, {}, {},
        {body: 'this one', speakers: ['yes0', 'yes1']},
        {body: 'only one', speakers: ['yes1']},
        {body: 'different', speakers: ['no0']},
        {}, {}, {}, {}, {}
      )

      const result = await resolver.random({criteria: {speakers: ['yes0', 'yes1']}})
      expect(result.found).to.equal(true)
      expect(result.text).to.equal('this one')
    })

    it('with all mentions', async function () {
      await populate(
        {}, {}, {}, {}, {},
        {body: 'this one', mentions: ['yes0', 'yes1']},
        {body: 'only one', mentions: ['yes1']},
        {body: 'different', mentions: ['no0']},
        {}, {}, {}, {}, {}
      )

      const result = await resolver.random({criteria: {mentions: ['yes0', 'yes1']}})
      expect(result.found).to.equal(true)
      expect(result.text).to.equal('this one')
    })
  })

  describe('all', function () {
    it('with no documents')
    it('with "first" less than the document count')
    it('with "first" equal to the document count')
    it('with "first" greater than the document count')
    it('with "after" less than the first document ID')
    it('with "after" as an intermediate document ID')
    it('with "after" greater than the last document ID')
    it('matching a query')
    it('with a matching subject')
    it('with all speakers')
    it('with all mentions')
  })

  describe('mine', function () {
    it('with no documents')
    it('with no documents matching the subject of the current user')
    it('with a document matching the subject of the current user')
  })

  describe('rank', function () {
    it('with no documents')
    it('with no documents matching with a matching speaker')
  })

  describe('count', function () {
    it('with no documents')
    it('with an empty query')
    it('matching a query')
    it('with a matching subject')
    it('with all speakers')
    it('with all mentions')
  })
})
