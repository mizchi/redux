import { compose } from '../src'

describe('Utils', () => {
  describe('compose', () => {
    it('composes from right to left', async () => {
      const double = x => x * 2
      const square = x => x * x
      expect(await compose(square)(5)).toBe(25)
      expect(await compose(square, double)(5)).toBe(100)
      expect(await compose(double, square, double)(5)).toBe(200)
    })

    it('composes functions from right to left', async () => {
      const a = next => x => next(x + 'a')
      const b = next => x => next(x + 'b')
      const c = next => x => next(x + 'c')
      const final = x => x

      expect((await compose(a, b, c)(final))('')).toBe('abc')
      expect((await compose(b, c, a)(final))('')).toBe('bca')
      expect((await compose(c, a, b)(final))('')).toBe('cab')
    })

    xit('throws at runtime if argument is not a function', () => {
      const square = x => x * x
      const add = (x, y) => x + y

      expect(() => compose(square, add, false)(1, 2)).toThrow()
      expect(() => compose(square, add, undefined)(1, 2)).toThrow()
      expect(() => compose(square, add, true)(1, 2)).toThrow()
      expect(() => compose(square, add, NaN)(1, 2)).toThrow()
      expect(() => compose(square, add, '42')(1, 2)).toThrow()
    })

    it('can be seeded with multiple arguments', async () => {
      const square = x => x * x
      const add = (x, y) => x + y
      expect(await compose(square, add)(1, 2)).toBe(9)
    })

    it('returns the first given argument if given no functions', async () => {
      expect(await compose()(1, 2)).toBe(1)
      expect(await compose()(3)).toBe(3)
      expect(await compose()()).toBe(undefined)
    })

    it('returns the first function if given only one', async () => {
      const fn = () => {}

      expect(await compose(fn)).toBe(fn)
    })
  })
})
