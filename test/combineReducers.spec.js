/* eslint-disable no-console */
import { combineReducers } from '../src'
import createStore, { ActionTypes } from '../src/createStore'

describe('Utils', () => {
  describe('combineReducers', () => {
    it('returns a composite reducer that maps the state keys to given reducers', async () => {
      const reducer = combineReducers({
        counter: (state = 0, action) =>
        action.type === 'increment' ? state + 1 : state,
        stack: (state = [], action) =>
        action.type === 'push' ? [ ...state, action.value ] : state
      })

      const s1 = await reducer({}, { type: 'increment' })
      expect(s1).toEqual({ counter: 1, stack: [] })
      const s2 = await reducer(s1, { type: 'push', value: 'a' })
      expect(s2).toEqual({ counter: 1, stack: [ 'a' ] })
    })

    it('ignores all props which are not a function', async () => {
      const reducer = combineReducers({
        fake: true,
        broken: 'string',
        another: { nested: 'object' },
        stack: (state = []) => state
      })

      expect(
        Object.keys(await reducer({ }, { type: 'push' }))
      ).toEqual([ 'stack' ])
    })

    it('warns if a reducer prop is undefined', () => {
      const preSpy = console.error
      const spy = jest.fn()
      console.error = spy

      let isNotDefined
      combineReducers({ isNotDefined })
      expect(spy.mock.calls[0][0]).toMatch(
        /No reducer provided for key "isNotDefined"/
      )

      spy.mockClear()
      combineReducers({ thing: undefined })
      expect(spy.mock.calls[0][0]).toMatch(
        /No reducer provided for key "thing"/
      )

      spy.mockClear()
      console.error = preSpy
    })

    xit('throws an error if a reducer returns undefined handling an action', async () => {
      const reducer = combineReducers({
        counter(state = 0, action) {
          switch (action && action.type) {
            case 'increment':
              return state + 1
            case 'decrement':
              return state - 1
            case 'whatever':
            case null:
            case undefined:
              return undefined
            default:
              return state
          }
        }
      })

      expect(
        async () => await reducer({ counter: 0 }, { type: 'whatever' })
      ).toThrow(
      /"whatever".*"counter"/
      )
      expect(
        async () => await reducer({ counter: 0 }, null)
      ).toThrow(
      /"counter".*an action/
      )
      expect(
        async () => await reducer({ counter: 0 }, { })
      ).toThrow(
      /"counter".*an action/
      )
    })

    it('throws an error on first call if a reducer returns undefined initializing', async () => {
      const reducer = combineReducers({
        counter(state, action) {
          switch (action.type) {
            case 'increment':
              return state + 1
            case 'decrement':
              return state - 1
            default:
              return state
          }
        }
      })

      try {
        await reducer()
      } catch (e) {
        expect(e.message).toMatch(/"counter".*initialization/)
      }
    })

    xit('catches error thrown in reducer when initializing and re-throw', () => {
      const reducer = combineReducers({
        throwingReducer() {
          throw new Error('Error thrown in reducer')
        }
      })
      expect(async () => await (reducer({ }))).toThrow(
        /Error thrown in reducer/
      )
    })

    it('allows a symbol to be used as an action type', async () => {
      const increment = Symbol('INCREMENT')

      const reducer = combineReducers({
        counter(state = 0, action) {
          switch (action.type) {
            case increment:
              return state + 1
            default:
              return state
          }
        }
      })

      expect((await reducer({ counter: 0 }, { type: increment })).counter).toEqual(1)
    })

    it('maintains referential equality if the reducers it is combining do', async () => {
      const reducer = combineReducers({
        child1(state = { }) {
          return state
        },
        child2(state = { }) {
          return state
        },
        child3(state = { }) {
          return state
        }
      })

      const initialState = await reducer(undefined, '@@INIT')
      expect((await reducer(initialState, { type: 'FOO' }))).toBe(initialState)
    })

    it('does not have referential equality if one of the reducers changes something', async () => {
      const reducer = combineReducers({
        child1(state = { }) {
          return state
        },
        child2(state = { count: 0 }, action) {
          switch (action.type) {
            case 'increment':
              return { count: state.count + 1 }
            default:
              return state
          }
        },
        child3(state = { }) {
          return state
        }
      })

      const initialState = await reducer(undefined, '@@INIT')
      expect((await reducer(initialState, { type: 'increment' }))).not.toBe(initialState)
    })

    xit('throws an error on first call if a reducer attempts to handle a private action', async () => {
      const reducer = combineReducers({
        counter(state, action) {
          switch (action.type) {
            case 'increment':
              return state + 1
            case 'decrement':
              return state - 1
            // Never do this in your code:
            case ActionTypes.INIT:
              return 0
            default:
              return undefined
          }
        }
      })
      expect(async () => (await reducer())).toThrow(
        /"counter".*private/
      )
    })

    it('warns if no reducers are passed to combineReducers', async () => {
      const preSpy = console.error
      const spy = jest.fn()
      console.error = spy

      const reducer = combineReducers({ })
      await reducer({ })
      expect(spy.mock.calls[0][0]).toMatch(
        /Store does not have a valid reducer/
      )
      spy.mockClear()
      console.error = preSpy
    })

    it('warns if input state does not match reducer shape', async () => {
      const preSpy = console.error
      const spy = jest.fn()
      console.error = spy

      const reducer = combineReducers({
        foo(state = { bar: 1 }) {
          return state
        },
        baz(state = { qux: 3 }) {
          return state
        }
      })

      await reducer()
      expect(spy.mock.calls.length).toBe(0)

      await reducer({ foo: { bar: 2 } })
      expect(spy.mock.calls.length).toBe(0)

      await reducer({
        foo: { bar: 2 },
        baz: { qux: 4 }
      })
      expect(spy.mock.calls.length).toBe(0)

      await createStore(reducer, { bar: 2 })
      expect(spy.mock.calls[0][0]).toMatch(
        /Unexpected key "bar".*createStore.*instead: "foo", "baz"/
      )

      await createStore(reducer, { bar: 2, qux: 4, thud: 5 })
      expect(spy.mock.calls[1][0]).toMatch(
        /Unexpected keys "qux", "thud".*createStore.*instead: "foo", "baz"/
      )

      await createStore(reducer, 1)
      expect(spy.mock.calls[2][0]).toMatch(
        /createStore has unexpected type of "Number".*keys: "foo", "baz"/
      )

      await reducer({ corge: 2 })
      expect(spy.mock.calls[3][0]).toMatch(
        /Unexpected key "corge".*reducer.*instead: "foo", "baz"/
      )

      await reducer({ fred: 2, grault: 4 })
      expect(spy.mock.calls[4][0]).toMatch(
        /Unexpected keys "fred", "grault".*reducer.*instead: "foo", "baz"/
      )

      await reducer(1)
      expect(spy.mock.calls[5][0]).toMatch(
        /reducer has unexpected type of "Number".*keys: "foo", "baz"/
      )

      await spy.mockClear()
      console.error = preSpy
    })

    it('only warns for unexpected keys once', async () => {
      const preSpy = console.error
      const spy = jest.fn()
      console.error = spy

      const foo = (state = { foo: 1 }) => state
      const bar = (state = { bar: 2 }) => state

      expect(spy.mock.calls.length).toBe(0)
      const reducer = combineReducers({ foo, bar })
      const state = { foo: 1, bar: 2, qux: 3 }
      await reducer(state, {})
      await reducer(state, {})
      await reducer(state, {})
      await reducer(state, {})
      expect(spy.mock.calls.length).toBe(1)
      await reducer({ ...state, baz: 5 }, {})
      await reducer({ ...state, baz: 5 }, {})
      await reducer({ ...state, baz: 5 }, {})
      await reducer({ ...state, baz: 5 }, {})
      expect(spy.mock.calls.length).toBe(2)

      spy.mockClear()
      console.error = preSpy
    })
  })
})
