// Lets code outside the React tree (the axios interceptor) trigger an in-app
// route change instead of a hard `window.location` reload. Registered once by
// <NavigationBridge> inside <BrowserRouter> (see App.tsx).
type NavigateFn = (path: string) => void

let navigateFn: NavigateFn | null = null

export function setNavigate(fn: NavigateFn) {
  navigateFn = fn
}

export function redirectToLogin() {
  if (navigateFn) {
    navigateFn('/login')
  } else {
    // Router hasn't mounted yet — fall back to a hard redirect.
    window.location.href = '/login'
  }
}
