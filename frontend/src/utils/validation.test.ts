import { describe, expect, it } from 'vitest'
import { validateEmail, validatePassword, validateRequired } from './validation'

describe('validateRequired', () => {
  it('rejects empty and blank text', () => {
    expect(validateRequired('', 'Name')).toBe('Name cannot be empty')
    expect(validateRequired('   ', 'Name')).toBe('Name cannot be empty')
  })
  it('accepts text', () => {
    expect(validateRequired('Ana', 'Name')).toBe('')
  })
})

describe('validateEmail', () => {
  it('accepts a normal address', () => {
    expect(validateEmail('user@routa.local')).toBe('')
  })
  it('rejects a missing or broken address', () => {
    expect(validateEmail('')).not.toBe('')
    expect(validateEmail('no-at-sign')).not.toBe('')
    expect(validateEmail('a@b')).not.toBe('')
    expect(validateEmail('a b@c.com')).not.toBe('')
  })
})

describe('validatePassword', () => {
  it('accepts 8 to 72 characters with a letter and a number', () => {
    expect(validatePassword('abcdefg1')).toBe('')
  })
  it('rejects short, long, letters-only and numbers-only passwords', () => {
    expect(validatePassword('')).not.toBe('')
    expect(validatePassword('abc1')).not.toBe('')
    expect(validatePassword('a1'.repeat(40))).not.toBe('')
    expect(validatePassword('abcdefgh')).not.toBe('')
    expect(validatePassword('12345678')).not.toBe('')
  })
})
