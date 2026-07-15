import type { JsonObject, JsonValue } from '../types.ts'

/**
 * Reads an own data property, treating inherited and absent keys alike.
 *
 * @remarks
 * Uses {@link Object.hasOwn} so prototype keys such as `__proto__` never
 * resolve through `Object.prototype`.
 */
export function getOwnProperty(target: JsonObject, key: string): JsonValue | undefined {
  return Object.hasOwn(target, key) ? target[key] : undefined
}

/**
 * Assigns an own data property without invoking inherited accessors.
 *
 * @remarks
 * A plain `target[key] = value` would trigger the `Object.prototype` setter for
 * keys such as `__proto__`, corrupting the prototype chain instead of storing an
 * own entry. Defining the property pins it as an ordinary own value.
 */
export function setOwnProperty(target: JsonObject, key: string, value: JsonValue): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  })
}
