/**
 * True on a phone-sized screen: narrower than 640px, Tailwind's "sm" breakpoint.
 * There the map's info card sits along the bottom of the map instead of on the right.
 * (The test browser, jsdom, has no matchMedia, so tests count as a wide screen.)
 */
export function isPhoneScreen(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 639px)').matches
}