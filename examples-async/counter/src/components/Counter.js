import React, { Component } from 'react'

class Counter extends Component {
  incrementIfOdd() {
    if (this.props.value % 2 !== 0) {
      this.props.onIncrement()
    }
  }

  render() {
    const { value, onIncrement, onIncrementAsync, onDecrement } = this.props
    return (
      <p>
        Clicked: {value} times
        {' '}
        <button onClick={onIncrement}>
          +
        </button>
        <button onClick={onIncrementAsync}>
          +async
        </button>
        {' '}
        <button onClick={onDecrement}>
          -
        </button>
      </p>
    )
  }
}

export default Counter
