const { createDocumentSet } = require('../../scripts/documentset')
const { DocumentSetResolver } = require('../../scripts/api/document-set')

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
        attrs.push({ kind: 'subject', value: spec.subject })
      }
      if (spec.speakers) {
        attrs.push(...spec.speakers.map(speaker => {
          return { kind: 'speaker', value: speaker }
        }))
      }
      if (spec.mentions) {
        attrs.push(...spec.mentions.map(mention => {
          return { kind: 'mention', value: mention }
        }))
      }

      promises.push(set.add('spec', body, attrs))
    }
    await Promise.all(promises)
  }

  describe('random', function () {
    it('with no documents', async function () {
      const result = await resolver.random({ criteria: {} })
      expect(result.found).to.equal(false)
    })

    it('with empty criteria', async function () {
      await populate({ body: 'one' })

      const result = await resolver.random({ criteria: {} })
      expect(result.found).to.equal(true)
    })

    it('matching a query', async function () {
      await populate(
        {}, {}, {}, {}, {},
        { body: 'one aaa one' },
        {}, {}, {}, {}, {}
      )

      const result = await resolver.random({ criteria: { query: 'aaa' } })
      expect(result.found).to.equal(true)
      expect(result.text).to.equal('one aaa one')
    })

    it('with a matching subject', async function () {
      await populate(
        {}, {}, {}, {}, {},
        { body: 'this one', subject: 'me' },
        { subject: 'other' }, { subject: 'other' },
        {}, {}, {}, {}, {}
      )

      const result = await resolver.random({ criteria: { subject: 'me' } })
      expect(result.found).to.equal(true)
      expect(result.text).to.equal('this one')
    })

    it('with all speakers', async function () {
      await populate(
        {}, {}, {}, {}, {},
        { body: 'this one', speakers: ['yes0', 'yes1'] },
        { body: 'only one', speakers: ['yes1'] },
        { body: 'different', speakers: ['no0'] },
        {}, {}, {}, {}, {}
      )

      const result = await resolver.random({ criteria: { speakers: ['yes0', 'yes1'] } })
      expect(result.found).to.equal(true)
      expect(result.text).to.equal('this one')
    })

    it('with all mentions', async function () {
      await populate(
        {}, {}, {}, {}, {},
        { body: 'this one', mentions: ['yes0', 'yes1'] },
        { body: 'only one', mentions: ['yes1'] },
        { body: 'different', mentions: ['no0'] },
        {}, {}, {}, {}, {}
      )

      const result = await resolver.random({ criteria: { mentions: ['yes0', 'yes1'] } })
      expect(result.found).to.equal(true)
      expect(result.text).to.equal('this one')
    })
  })

  describe('all', function () {
    it('with no documents', async function () {
      const result = await resolver.all({ criteria: {} })

      expect(result.edges).to.have.lengthOf(0)
      expect(result.pageInfo.hasPreviousPage).to.equal(false)
      expect(result.pageInfo.hasNextPage).to.equal(false)
    })

    it('with "first" less than the document count', async function () {
      await populate({}, {}, {}, {}, {})

      const result = await resolver.all({ criteria: {}, first: 4 })
      expect(result.edges).to.have.lengthOf(4)
      expect(result.pageInfo.hasPreviousPage).to.equal(false)
      expect(result.pageInfo.hasNextPage).to.equal(true)
    })

    it('with "first" equal to the document count', async function () {
      await populate({}, {}, {}, {}, {})

      const result = await resolver.all({ criteria: {}, first: 5 })
      expect(result.edges).to.have.lengthOf(5)
      expect(result.pageInfo.hasPreviousPage).to.equal(false)
      expect(result.pageInfo.hasNextPage).to.equal(false)
    })

    it('with "first" greater than the document count', async function () {
      await populate({}, {}, {}, {}, {})

      const result = await resolver.all({ criteria: {}, first: 10 })
      expect(result.edges).to.have.lengthOf(5)
      expect(result.pageInfo.hasPreviousPage).to.equal(false)
      expect(result.pageInfo.hasNextPage).to.equal(false)
    })

    it('with "after" less than the first document ID', async function () {
      await populate({}, {}, {}, {}, {})

      const result = await resolver.all({ criteria: {}, after: '0' })
      expect(result.edges).to.have.lengthOf(5)
      expect(result.pageInfo.hasPreviousPage).to.equal(false)
      expect(result.pageInfo.hasNextPage).to.equal(false)
    })

    it('with "after" as an intermediate document ID', async function () {
      await populate({}, {}, {}, {}, {})

      const result = await resolver.all({ criteria: {}, after: '3' })
      expect(result.edges).to.have.lengthOf(2)
      expect(result.pageInfo.hasPreviousPage).to.equal(true)
      expect(result.pageInfo.hasNextPage).to.equal(false)
    })

    it('with "after" greater than the last document ID', async function () {
      await populate({}, {}, {}, {}, {})

      const result = await resolver.all({ criteria: {}, after: '10' })
      expect(result.edges).to.have.lengthOf(0)
      expect(result.pageInfo.hasPreviousPage).to.equal(true)
      expect(result.pageInfo.hasNextPage).to.equal(false)
    })

    it('matching a query', async function () {
      await populate(
        {}, {},
        { body: 'aaa 0' }, { body: 'aaa 1' }, { body: '2 aaa' },
        {}, {}
      )

      const result = await resolver.all({ criteria: { query: 'aaa' } })
      expect(result.edges).to.have.lengthOf(3)
      expect(result.edges.map(edge => edge.node.text)).to.have.members([
        'aaa 0', 'aaa 1', '2 aaa'
      ])
      expect(result.pageInfo.hasPreviousPage).to.equal(false)
      expect(result.pageInfo.hasNextPage).to.equal(false)
    })

    it('with a matching subject', async function () {
      await populate(
        {}, {},
        { body: 'yes 0', subject: 'me' }, { body: 'yes 1', subject: 'me' },
        { body: 'no 0', subject: 'other' },
        {}, {}
      )

      const result = await resolver.all({ criteria: { subject: 'me' } })
      expect(result.edges).to.have.lengthOf(2)
      expect(result.edges.map(edge => edge.node.text)).to.have.members([
        'yes 0', 'yes 1'
      ])
      expect(result.pageInfo.hasPreviousPage).to.equal(false)
      expect(result.pageInfo.hasNextPage).to.equal(false)
    })

    it('with all speakers', async function () {
      await populate(
        {}, {},
        { body: 'yes 0', speakers: ['me0', 'me1'] },
        { body: 'yes 1', speakers: ['me0', 'me1'] },
        { body: 'no 0', speakers: ['me1'] },
        { body: 'no 1', speakers: ['me1', 'other'] },
        { body: 'no 2', speakers: ['other'] },
        {}, {}
      )

      const result = await resolver.all({ criteria: { speakers: ['me0', 'me1'] } })
      expect(result.edges).to.have.lengthOf(2)
      expect(result.edges.map(edge => edge.node.text)).to.have.members([
        'yes 0', 'yes 1'
      ])
      expect(result.pageInfo.hasPreviousPage).to.equal(false)
      expect(result.pageInfo.hasNextPage).to.equal(false)
    })

    it('with all mentions', async function () {
      await populate(
        {}, {},
        { body: 'yes 0', mentions: ['me0', 'me1'] },
        { body: 'yes 1', mentions: ['me1', 'me0'] },
        { body: 'no 0', mentions: ['me1'] },
        { body: 'no 1', mentions: ['me1', 'other'] },
        { body: 'no 2', mentions: ['other'] },
        {}, {}
      )

      const result = await resolver.all({ criteria: { mentions: ['me0', 'me1'] } })
      expect(result.edges).to.have.lengthOf(2)
      expect(result.edges.map(edge => edge.node.text)).to.have.members([
        'yes 0', 'yes 1'
      ])
      expect(result.pageInfo.hasPreviousPage).to.equal(false)
      expect(result.pageInfo.hasNextPage).to.equal(false)
    })
  })

  describe('mine', function () {
    it('with no documents', async function () {
      const req = { user: { name: 'me' } }
      const result = await resolver.mine({}, req)

      expect(result.found).to.equal(false)
    })

    it('with no documents matching the subject of the current user', async function () {
      await populate(
        {}, {}, {}, {},
        { subject: 'other' }
      )

      const req = { user: { name: 'me' } }
      const result = await resolver.mine({}, req)

      expect(result.found).to.equal(false)
    })

    it('with a document matching the subject of the current user', async function () {
      await populate(
        {}, {}, {}, {},
        { body: 'yes', subject: 'me' },
        { subject: 'other' }
      )

      const req = { user: { name: 'me' } }
      const result = await resolver.mine({}, req)

      expect(result.found).to.equal(true)
      expect(result.text).to.equal('yes')
    })
  })

  describe('rank', function () {
    it('with no documents', async function () {
      const result = await resolver.rank({ speaker: 'me' })
      expect(result).to.equal(0)
    })

    it('with no documents matching with a matching speaker', async function () {
      await populate(
        {}, {}, { speakers: ['other'] }, { speakers: ['no'] }
      )

      const result = await resolver.rank({ speaker: 'me' })
      expect(result).to.equal(0)
    })

    it('with documents matching the requested speaker', async function () {
      await populate(
        { speakers: ['me'] },
        { speakers: ['me'] },
        { speakers: ['me'] },
        { speakers: ['first'] },
        { speakers: ['first'] },
        { speakers: ['first'] },
        { speakers: ['first'] },
        { speakers: ['last'] },
        { speakers: ['last'] }
      )

      const result = await resolver.rank({ speaker: 'me' })
      expect(result).to.equal(2)
    })
  })

  describe('count', function () {
    it('with no documents', async function () {
      const result = await resolver.count({ criteria: {} })
      expect(result).to.equal(0)
    })

    it('with an empty query', async function () {
      await populate({}, {}, {})

      const result = await resolver.count({ criteria: {} })
      expect(result).to.equal(3)
    })

    it('matching a query', async function () {
      await populate(
        {}, {}, {},
        { body: 'yes zzz 0' }, { body: 'yes 1 zzz' },
        {}, {}
      )

      const result = await resolver.count({ criteria: { query: 'zzz' } })
      expect(result).to.equal(2)
    })

    it('with a matching subject', async function () {
      await populate(
        {}, {}, {},
        { subject: 'me' }, { subject: 'me' },
        { subject: 'other' },
        {}, {}
      )

      const result = await resolver.count({ criteria: { subject: 'me' } })
      expect(result).to.equal(2)
    })

    it('with all speakers', async function () {
      await populate(
        { speakers: ['yes0'] },
        { speakers: ['yes0', 'yes1'] },
        { speakers: ['yes0', 'yes1', 'extra'] },
        { speakers: ['no0'] },
        {}
      )

      const result = await resolver.count({ criteria: { speakers: ['yes0', 'yes1'] } })
      expect(result).to.equal(2)
    })

    it('with all mentions', async function () {
      await populate(
        { mentions: ['yes0'] },
        { mentions: ['yes0', 'yes1'] },
        { mentions: ['yes0', 'yes1', 'extra'] },
        { mentions: ['no0'] },
        {}
      )

      const result = await resolver.count({ criteria: { mentions: ['yes0', 'yes1'] } })
      expect(result).to.equal(2)
    })
  })
})
