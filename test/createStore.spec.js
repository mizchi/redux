import { createStore, combineReducers } from '../src/index'
import { addTodo, dispatchInMiddle, throwError, unknownAction } from './helpers/actionCreators'
import * as reducers from './helpers/reducers'
import * as Rx from 'rxjs'
import $$observable from 'symbol-observable'

describe('createStore', () => {
  it('exposes the public API', async () => {
    const store = await createStore(combineReducers(reducers))
    const methods = Object.keys(store)

    expect(methods.length).toBe(4)
    expect(methods).toContain('subscribe')
    expect(methods).toContain('dispatch')
    expect(methods).toContain('getState')
    expect(methods).toContain('replaceReducer')
  })

  xit('throws if reducer is not a function', () => {
    expect(async () =>
      await createStore()
    ).toThrow()

    expect(async () =>
      await createStore('test')
    ).toThrow()

    expect(async () =>
      await createStore({})
    ).toThrow()

    expect(async () =>
      await createStore(() => {})
    ).not.toThrow()
  })

  it('passes the initial action and the initial state', async () => {
    const store = await createStore(reducers.todos, [
      {
        id: 1,
        text: 'Hello'
      }
    ])
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }
    ])
  })

  it('applies the reducer to the previous state', async () => {
    const store = await createStore(reducers.todos)
    expect(store.getState()).toEqual([])

    await store.dispatch(unknownAction())
    expect(store.getState()).toEqual([])

    await store.dispatch(addTodo('Hello'))
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }
    ])

    await store.dispatch(addTodo('World'))
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }, {
        id: 2,
        text: 'World'
      }
    ])
  })

  it('applies the reducer to the initial state', async () => {
    const store = await createStore(reducers.todos, [
      {
        id: 1,
        text: 'Hello'
      }
    ])
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }
    ])

    await store.dispatch(unknownAction())
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }
    ])

    await store.dispatch(addTodo('World'))
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }, {
        id: 2,
        text: 'World'
      }
    ])
  })

  it('preserves the state when replacing a reducer', async () => {
    const store = await createStore(reducers.todos)
    await store.dispatch(addTodo('Hello'))
    await store.dispatch(addTodo('World'))
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      },
      {
        id: 2,
        text: 'World'
      }
    ])

    await store.replaceReducer(reducers.todosReverse)
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }, {
        id: 2,
        text: 'World'
      }
    ])

    await store.dispatch(addTodo('Perhaps'))
    expect(store.getState()).toEqual([
      {
        id: 3,
        text: 'Perhaps'
      },
      {
        id: 1,
        text: 'Hello'
      },
      {
        id: 2,
        text: 'World'
      }
    ])

    await store.replaceReducer(reducers.todos)
    expect(store.getState()).toEqual([
      {
        id: 3,
        text: 'Perhaps'
      },
      {
        id: 1,
        text: 'Hello'
      },
      {
        id: 2,
        text: 'World'
      }
    ])

    await store.dispatch(addTodo('Surely'))
    expect(store.getState()).toEqual([
      {
        id: 3,
        text: 'Perhaps'
      },
      {
        id: 1,
        text: 'Hello'
      },
      {
        id: 2,
        text: 'World'
      },
      {
        id: 4,
        text: 'Surely'
      }
    ])
  })

  it('supports multiple subscriptions', async () => {
    const store = await createStore(reducers.todos)
    const listenerA = jest.fn()
    const listenerB = jest.fn()

    let unsubscribeA = store.subscribe(listenerA)
    await store.dispatch(unknownAction())
    expect(listenerA.mock.calls.length).toBe(1)
    expect(listenerB.mock.calls.length).toBe(0)

    await store.dispatch(unknownAction())
    expect(listenerA.mock.calls.length).toBe(2)
    expect(listenerB.mock.calls.length).toBe(0)

    const unsubscribeB = await store.subscribe(listenerB)
    expect(listenerA.mock.calls.length).toBe(2)
    expect(listenerB.mock.calls.length).toBe(0)

    await store.dispatch(unknownAction())
    expect(listenerA.mock.calls.length).toBe(3)
    expect(listenerB.mock.calls.length).toBe(1)

    unsubscribeA()
    expect(listenerA.mock.calls.length).toBe(3)
    expect(listenerB.mock.calls.length).toBe(1)

    await store.dispatch(unknownAction())
    expect(listenerA.mock.calls.length).toBe(3)
    expect(listenerB.mock.calls.length).toBe(2)

    unsubscribeB()
    expect(listenerA.mock.calls.length).toBe(3)
    expect(listenerB.mock.calls.length).toBe(2)

    await store.dispatch(unknownAction())
    expect(listenerA.mock.calls.length).toBe(3)
    expect(listenerB.mock.calls.length).toBe(2)

    unsubscribeA = await store.subscribe(listenerA)
    expect(listenerA.mock.calls.length).toBe(3)
    expect(listenerB.mock.calls.length).toBe(2)

    await store.dispatch(unknownAction())
    expect(listenerA.mock.calls.length).toBe(4)
    expect(listenerB.mock.calls.length).toBe(2)
  })

  it('only removes listener once when unsubscribe is called', async () => {
    const store = await createStore(reducers.todos)
    const listenerA = jest.fn()
    const listenerB = jest.fn()

    const unsubscribeA = store.subscribe(listenerA)
    store.subscribe(listenerB)

    unsubscribeA()
    unsubscribeA()

    await store.dispatch(unknownAction())
    expect(listenerA.mock.calls.length).toBe(0)
    expect(listenerB.mock.calls.length).toBe(1)
  })

  it('only removes relevant listener when unsubscribe is called', async () => {
    const store = await createStore(reducers.todos)
    const listener = jest.fn()

    store.subscribe(listener)
    const unsubscribeSecond = store.subscribe(listener)

    unsubscribeSecond()
    unsubscribeSecond()

    await store.dispatch(unknownAction())
    expect(listener.mock.calls.length).toBe(1)
  })

  it('supports removing a subscription within a subscription', async () => {
    const store = await createStore(reducers.todos)
    const listenerA = jest.fn()
    const listenerB = jest.fn()
    const listenerC = jest.fn()

    store.subscribe(listenerA)
    const unSubB = store.subscribe(() => {
      listenerB()
      unSubB()
    })
    store.subscribe(listenerC)

    await store.dispatch(unknownAction())
    await store.dispatch(unknownAction())

    expect(listenerA.mock.calls.length).toBe(2)
    expect(listenerB.mock.calls.length).toBe(1)
    expect(listenerC.mock.calls.length).toBe(2)
  })

  it('delays unsubscribe until the end of current dispatch', async () => {
    const store = await createStore(reducers.todos)

    const unsubscribeHandles = []
    const doUnsubscribeAll = () => unsubscribeHandles.forEach(
      unsubscribe => unsubscribe()
    )

    const listener1 = jest.fn()
    const listener2 = jest.fn()
    const listener3 = jest.fn()

    unsubscribeHandles.push(store.subscribe(() => listener1()))
    unsubscribeHandles.push(store.subscribe(() => {
      listener2()
      doUnsubscribeAll()
    }))
    unsubscribeHandles.push(store.subscribe(() => listener3()))

    await store.dispatch(unknownAction())
    expect(listener1.mock.calls.length).toBe(1)
    expect(listener2.mock.calls.length).toBe(1)
    expect(listener3.mock.calls.length).toBe(1)

    await store.dispatch(unknownAction())
    expect(listener1.mock.calls.length).toBe(1)
    expect(listener2.mock.calls.length).toBe(1)
    expect(listener3.mock.calls.length).toBe(1)
  })

  it('delays subscribe until the end of current dispatch', async () => {
    const store = await createStore(reducers.todos)

    const listener1 = jest.fn()
    const listener2 = jest.fn()
    const listener3 = jest.fn()

    let listener3Added = false
    const maybeAddThirdListener = () => {
      if (!listener3Added) {
        listener3Added = true
        store.subscribe(() => listener3())
      }
    }

    store.subscribe(() => listener1())
    store.subscribe(() => {
      listener2()
      maybeAddThirdListener()
    })

    await store.dispatch(unknownAction())
    expect(listener1.mock.calls.length).toBe(1)
    expect(listener2.mock.calls.length).toBe(1)
    expect(listener3.mock.calls.length).toBe(0)

    await store.dispatch(unknownAction())
    expect(listener1.mock.calls.length).toBe(2)
    expect(listener2.mock.calls.length).toBe(2)
    expect(listener3.mock.calls.length).toBe(1)
  })

  xit('uses the last snapshot of subscribers during nested dispatch', async () => {
    const store = await createStore(reducers.todos)

    const listener1 = jest.fn()
    const listener2 = jest.fn()
    const listener3 = jest.fn()
    const listener4 = jest.fn()

    let unsubscribe4
    const unsubscribe1 = store.subscribe(async () => {
      listener1()
      expect(listener1.mock.calls.length).toBe(1)
      expect(listener2.mock.calls.length).toBe(0)
      expect(listener3.mock.calls.length).toBe(0)
      expect(listener4.mock.calls.length).toBe(0)

      unsubscribe1()
      unsubscribe4 = store.subscribe(listener4)
      await store.dispatch(unknownAction())

      expect(listener1.mock.calls.length).toBe(1)
      expect(listener2.mock.calls.length).toBe(1)
      expect(listener3.mock.calls.length).toBe(1)
      expect(listener4.mock.calls.length).toBe(1)
    })
    store.subscribe(listener2)
    store.subscribe(listener3)

    await store.dispatch(unknownAction())
    expect(listener1.mock.calls.length).toBe(1)
    expect(listener2.mock.calls.length).toBe(2)
    expect(listener3.mock.calls.length).toBe(2)
    expect(listener4.mock.calls.length).toBe(1)

    unsubscribe4()
    await store.dispatch(unknownAction())
    expect(listener1.mock.calls.length).toBe(1)
    expect(listener2.mock.calls.length).toBe(3)
    expect(listener3.mock.calls.length).toBe(3)
    expect(listener4.mock.calls.length).toBe(1)
  })

  it('provides an up-to-date state when a subscriber is notified', async done => {
    const store = await createStore(reducers.todos)
    await store.subscribe(() => {
      expect(store.getState()).toEqual([
        {
          id: 1,
          text: 'Hello'
        }
      ])
      done()
    })
    await store.dispatch(addTodo('Hello'))
  })

  it('does not leak private listeners array', async done => {
    const store = await createStore(reducers.todos)
    store.subscribe(function () {
      expect(this).toBe(undefined)
      done()
    })
    await store.dispatch(addTodo('Hello'))
  })

  xit('only accepts plain object actions', async () => {
    const store = await createStore(reducers.todos)
    expect(async () =>
      await store.dispatch(unknownAction())
    ).not.toThrow()

    function AwesomeMap() { }
    [ null, undefined, 42, 'hey', new AwesomeMap() ].forEach(nonObject =>
      expect(async () =>
        await store.dispatch(nonObject)
      ).toThrow(/plain/)
    )
  })

  it('handles nested dispatches gracefully', async () => {
    function foo(state = 0, action) {
      return action.type === 'foo' ? 1 : state
    }

    function bar(state = 0, action) {
      return action.type === 'bar' ? 2 : state
    }

    const store = await createStore(combineReducers({ foo, bar }))

    store.subscribe(async function kindaComponentDidUpdate() {
      const state = store.getState()
      if (state.bar === 0) {
        await store.dispatch({ type: 'bar' })
      }
    })

    await store.dispatch({ type: 'foo' })
    expect(store.getState()).toEqual({
      foo: 1,
      bar: 2
    })
  })

  xit('does not allow dispatch() from within a reducer', async () => {
    const store = await createStore(reducers.dispatchInTheMiddleOfReducer)

    expect(async () =>
      await store.dispatch(dispatchInMiddle(store.dispatch.bind(store, unknownAction())))
    ).toThrow(/may not dispatch/)
  })

  xit('recovers from an error within a reducer', async () => {
    const store = await createStore(reducers.errorThrowingReducer)
    expect(async () =>
      await store.dispatch(throwError())
    ).toThrow()

    expect(async () =>
      await store.dispatch(unknownAction())
    ).not.toThrow()
  })

  xit('throws if action type is missing', async () => {
    const store = await createStore(reducers.todos)
    expect(async () =>
      await store.dispatch({})
    ).toThrow(/Actions may not have an undefined "type" property/)
  })

  xit('throws if action type is undefined', async () => {
    const store = await createStore(reducers.todos)
    expect(async () =>
      await store.dispatch({ type: undefined })
    ).toThrow(/Actions may not have an undefined "type" property/)
  })

  it('does not throw if action type is falsy', async () => {
    const store = await createStore(reducers.todos)
    await store.dispatch({ type: false })
    await store.dispatch({ type: 0 })
    await store.dispatch({ type: null })
    await store.dispatch({ type: '' })
  })

  it('accepts enhancer as the third argument', async () => {
    const emptyArray = []
    const spyEnhancer = vanillaCreateStore => async (...args) => {
      expect(args[0]).toBe(reducers.todos)
      expect(args[1]).toBe(emptyArray)
      expect(args.length).toBe(2)
      const vanillaStore = await vanillaCreateStore(...args)
      return {
        ...vanillaStore,
        dispatch: jest.fn(vanillaStore.dispatch)
      }
    }

    const store = await createStore(reducers.todos, emptyArray, spyEnhancer)
    const action = addTodo('Hello')
    await store.dispatch(action)
    expect(store.dispatch).toBeCalledWith(action)
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }
    ])
  })

  xit('accepts enhancer as the second argument if initial state is missing', async () => {
    const spyEnhancer = vanillaCreateStore => async (...args) => {
      expect(args[0]).toBe(reducers.todos)
      expect(args[1]).toBe(undefined)
      expect(args.length).toBe(2)
      const vanillaStore = await vanillaCreateStore(...args)
      return {
        ...vanillaStore,
        dispatch: jest.fn(vanillaStore.dispatch)
      }
    }

    const store = await createStore(reducers.todos, spyEnhancer)
    const action = addTodo('Hello')
    await store.dispatch(action)
    expect(store.dispatch).toBeCalledWith(action)
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }
    ])
  })

  xit('throws if enhancer is neither undefined nor a function', async () => {
    expect(async () =>
      await createStore(reducers.todos, undefined, {})
    ).toThrow()

    expect(async () =>
      await createStore(reducers.todos, undefined, [])
    ).toThrow()

    expect(async () =>
      await createStore(reducers.todos, undefined, null)
    ).toThrow()

    expect(async () =>
      await createStore(reducers.todos, undefined, false)
    ).toThrow()

    expect(async () =>
      await createStore(reducers.todos, undefined, undefined)
    ).not.toThrow()

    expect(async () =>
      await createStore(reducers.todos, undefined, x => x)
    ).not.toThrow()

    expect(async () =>
      await createStore(reducers.todos, x => x)
    ).not.toThrow()

    expect(async () =>
      await createStore(reducers.todos, [])
    ).not.toThrow()

    expect(async () =>
      await createStore(reducers.todos, {})
    ).not.toThrow()
  })

  xit('throws if nextReducer is not a function', async () => {
    const store = await createStore(reducers.todos)

    expect(async () =>
      await store.replaceReducer()
    ).toThrow('Expected the nextReducer to be a function.')

    expect(async () =>
      await store.replaceReducer(() => {})
    ).not.toThrow()
  })

  it('throws if listener is not a function', async () => {
    const store = await createStore(reducers.todos)

    expect(() =>
      store.subscribe()
    ).toThrow()

    expect(() =>
      store.subscribe('')
    ).toThrow()

    expect(() =>
      store.subscribe(null)
    ).toThrow()

    expect(() =>
      store.subscribe(undefined)
    ).toThrow()
  })

  describe('Symbol.observable interop point', () => {
    it('should exist', async() => {
      const store = await createStore(() => {})
      expect(typeof store[$$observable]).toBe('function')
    })

    describe('returned value', () => {
      it('should be subscribable', async () => {
        const store = await createStore(() => {})
        const obs = store[$$observable]()
        expect(typeof obs.subscribe).toBe('function')
      })

      it('should throw a TypeError if an observer object is not supplied to subscribe', async () => {
        const store = await createStore(() => {})
        const obs = store[$$observable]()

        expect(function () {
          obs.subscribe()
        }).toThrow()

        expect(function () {
          obs.subscribe(() => {})
        }).toThrow()

        expect(function () {
          obs.subscribe({})
        }).not.toThrow()
      })

      it('should return a subscription object when subscribed', async () => {
        const store = await createStore(() => {})
        const obs = store[$$observable]()
        const sub = obs.subscribe({})
        expect(typeof sub.unsubscribe).toBe('function')
      })
    })

    it('should pass an integration test with no unsubscribe', async () => {
      function foo(state = 0, action) {
        return action.type === 'foo' ? 1 : state
      }

      function bar(state = 0, action) {
        return action.type === 'bar' ? 2 : state
      }

      const store = await createStore(combineReducers({ foo, bar }))
      const observable = store[$$observable]()
      const results = []

      observable.subscribe({
        next(state) {
          results.push(state)
        }
      })

      await store.dispatch({ type: 'foo' })
      await store.dispatch({ type: 'bar' })

      expect(results).toEqual([ { foo: 0, bar: 0 }, { foo: 1, bar: 0 }, { foo: 1, bar: 2 } ])
    })

    it('should pass an integration test with an unsubscribe', async () => {
      function foo(state = 0, action) {
        return action.type === 'foo' ? 1 : state
      }

      function bar(state = 0, action) {
        return action.type === 'bar' ? 2 : state
      }

      const store = await createStore(combineReducers({ foo, bar }))
      const observable = store[$$observable]()
      const results = []

      const sub = observable.subscribe({
        next(state) {
          results.push(state)
        }
      })

      await store.dispatch({ type: 'foo' })
      sub.unsubscribe()
      await store.dispatch({ type: 'bar' })

      expect(results).toEqual([ { foo: 0, bar: 0 }, { foo: 1, bar: 0 } ])
    })

    it('should pass an integration test with a common library (RxJS)', async () => {
      function foo(state = 0, action) {
        return action.type === 'foo' ? 1 : state
      }

      function bar(state = 0, action) {
        return action.type === 'bar' ? 2 : state
      }

      const store = await createStore(combineReducers({ foo, bar }))
      const observable = Rx.Observable.from(store)
      const results = []

      const sub = observable
        .map(state => ({ fromRx: true, ...state }))
        .subscribe(state => results.push(state))

      await store.dispatch({ type: 'foo' })
      sub.unsubscribe()
      await store.dispatch({ type: 'bar' })

      expect(results).toEqual([ { foo: 0, bar: 0, fromRx: true }, { foo: 1, bar: 0, fromRx: true } ])
    })
  })
})
