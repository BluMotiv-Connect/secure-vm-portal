// Debounce utility to prevent rapid API calls
export const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

// Rate limiting utility for API calls
export const createRateLimiter = (maxCalls = 10, windowMs = 60000) => {
  const calls = []
  
  return (fn) => {
    const now = Date.now()
    
    // Remove calls outside the window
    while (calls.length > 0 && calls[0] < now - windowMs) {
      calls.shift()
    }
    
    // Check if we're at the limit
    if (calls.length >= maxCalls) {
      console.warn('Rate limit reached, delaying API call...')
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          fn().then(resolve).catch(reject)
        }, 1000) // Delay by 1 second
      })
    }
    
    calls.push(now)
    return fn()
  }
}

// Simple request deduplication
const pendingRequests = new Map()

export const dedupeRequest = (key, requestFn) => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)
  }
  
  const promise = requestFn().finally(() => {
    pendingRequests.delete(key)
  })
  
  pendingRequests.set(key, promise)
  return promise
}