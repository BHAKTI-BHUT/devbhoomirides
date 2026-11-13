Object.defineProperty(process, 'stdin', {
  configurable: true,
  get() {
    const error = new Error('Production runtime accessed stdin.')
    error.code = 'EEXIST'
    throw error
  },
})
