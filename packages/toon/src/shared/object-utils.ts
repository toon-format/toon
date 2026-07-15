import type { JsonObject, JsonValue } from '../types.ts'

/**
 * Reads an own data property, treating inherited and absent keys alike.
 *
 * @remarks
 * Keys such as `__proto__` must not resolve through the prototype chain.
 */
export function getOwnProperty(target: JsonObject, key: string): JsonValue | undefined {
  return Object.hasOwn(target, key) ? target[key] : undefined
}

/**
 * Assigns an own data property without invoking inherited accessors.
 *
 * @remarks
 * Plain assignment of `__proto__` would hit the `Object.prototype` setter and
 * corrupt the prototype chain; `defineProperty` avoids that but is markedly
 * slower, so every other key takes plain assignment.
 */
export function setOwnProperty(target: JsonObject, key: string, value: JsonValue): void {
  if (key === '__proto__') {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    })
    return
  }

  target[key] = value
}
