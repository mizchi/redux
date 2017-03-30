import 'babel-polyfill'
import React from 'react'
import ReactDOM from 'react-dom'
import { createStore } from '../../../dist/redux'
import Counter from './components/Counter'
import counter from './reducers'

const main = async () => {
  const store = await createStore(counter)
  const rootEl = document.getElementById('root')

  const render = () => ReactDOM.render(
    <Counter
      value={store.getState()}
      onIncrement={async () => await store.dispatch({ type: 'INCREMENT' })}
      onIncrementAsync={async () => await store.dispatch({ type: 'INCREMENT_ASYNC' })}
      onDecrement={async () => await store.dispatch({ type: 'DECREMENT' })}
    />,
    rootEl
  )

  render()
  store.subscribe(render)
}

main()
