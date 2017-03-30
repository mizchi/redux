export default async (state = 0, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1
    case 'INCREMENT_ASYNC':
      await new Promise(done => {
        setTimeout(done, 500)
      })
      return await Promise.resolve(state + 1)
    case 'DECREMENT':
      return state - 1
    default:
      return state
  }
}
