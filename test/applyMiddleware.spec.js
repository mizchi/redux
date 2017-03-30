import { createStore, applyMiddleware } from '../src/index'
import * as reducers from './helpers/reducers'
import { addTodo, addTodoAsync, addTodoIfEmpty } from './helpers/actionCreators'
import { thunk } from './helpers/middleware'

describe('applyMiddleware', () => {
  it('wraps dispatch method with middleware once', async () => {
    function test(spyOnMethods) {
      return methods => {
        spyOnMethods(methods)
        return next => action => next(action)
      }
    }

    const spy = jest.fn()
    const store = await applyMiddleware(test(spy), thunk)(createStore)(reducers.todos)

    await store.dispatch(addTodo('Use Redux'))
    await store.dispatch(addTodo('Flux FTW!'))

    expect(spy.mock.calls.length).toEqual(1)

    expect(spy.mock.calls[0][0]).toHaveProperty('getState')
    expect(spy.mock.calls[0][0]).toHaveProperty('dispatch')

    expect(store.getState()).toEqual([ { id: 1, text: 'Use Redux' }, { id: 2, text: 'Flux FTW!' } ])
  })

  it('passes recursive dispatches through the middleware chain', async () => {
    function test(spyOnMethods) {
      return () => next => action => {
        spyOnMethods(action)
        return next(action)
      }
    }

    const spy = jest.fn()
    const store = await applyMiddleware(test(spy), thunk)(createStore)(reducers.todos)

    await store.dispatch(addTodoAsync('Use Redux'))
    expect(spy.mock.calls.length).toEqual(2)
  })

  xit('works with thunk middleware', async done => {
    const store = await applyMiddleware(thunk)(createStore)(reducers.todos)

    await store.dispatch(addTodoIfEmpty('Hello'))
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }
    ])

    await store.dispatch(addTodoIfEmpty('Hello'))
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
      },
      {
        id: 2,
        text: 'World'
      }
    ])

    await store.dispatch(addTodoAsync('Maybe'))
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      },
      {
        id: 2,
        text: 'World'
      },
      {
        id: 3,
        text: 'Maybe'
      }
    ])
  })

  xit('keeps unwrapped dispatch available while middleware is initializing', async () => {
    // This is documenting the existing behavior in Redux 3.x.
    // We plan to forbid this in Redux 4.x.

    async function earlyDispatch({ dispatch }) {
      await dispatch(addTodo('Hello'))
      return () => action => action
    }

    const store = await createStore(reducers.todos, applyMiddleware(earlyDispatch))
    expect(store.getState()).toEqual([
      {
        id: 1,
        text: 'Hello'
      }
    ])
  })
})
