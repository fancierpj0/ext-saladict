import { search } from '@/components/dictionaries/google/engine'
import { appConfigFactory } from '@/app-config'
import fs from 'fs'
import path from 'path'

const homepage = fs.readFileSync(path.join(__dirname, 'response/homepage.html'), 'utf8')
const translation = fs.readFileSync(path.join(__dirname, 'response/f.txt'), 'utf8')

const fetchbak = window.fetch

describe('Dict/Google/engine', () => {
  beforeAll(() => {
    window.fetch = jest.fn((url: string) => Promise.resolve({
      ok: true,
      text: () => /translate_a|googleapis\.com/.test(url) ? translation : homepage
    }))
  })

  afterAll(() => {
    window.fetch = fetchbak
  })

  it('should parse result correctly', () => {
    return search('any', appConfigFactory(), {})
      .then(searchResult => {
        expect(searchResult.audio).toBeUndefined()
        expect(searchResult.result.trans.text).toBe('不要温柔地进入那个晚安。 愤怒，对光明的消逝愤怒。')
        expect(searchResult.result.id).toBe('google')
        expect(searchResult.result.sl).toBe('auto')
        expect(searchResult.result.tl).toBe('en')
        expect(typeof searchResult.result.trans.audio).toBe('string')
        expect(typeof searchResult.result.searchText.text).toBe('string')
        expect(typeof searchResult.result.searchText.audio).toBe('string')
      })
  })

  it('should parse result correctly with payload', () => {
    return search('any', appConfigFactory(), { sl: 'en', tl: 'jp' })
      .then(searchResult => {
        expect(searchResult.result.sl).toBe('en')
        expect(searchResult.result.tl).toBe('jp')
      })
  })
})
