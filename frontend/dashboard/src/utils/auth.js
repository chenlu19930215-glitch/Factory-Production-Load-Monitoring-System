const TOKEN_KEY = 'factory_monitor_token'
const USER_KEY = 'factory_monitor_user'

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function getUser() {
  const raw = sessionStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function setUser(user) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function isLoggedIn() {
  return !!getToken()
}
