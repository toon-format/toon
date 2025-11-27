import type { JsonObject, JsonStreamEvent, JsonValue } from '../types'
import { QUOTED_KEY_MARKER } from './expand'

// #region Build context types

type BuildContext
  = | { type: 'object', obj: JsonObject, currentKey?: string, quotedKeys: Set<string> }
    | { type: 'array', arr: JsonValue[] }

interface BuildState {
  stack: BuildContext[]
  root: JsonValue | undefined
}

// #endregion

// #region Synchronous AST builder

export function buildValueFromEvents(events: Iterable<JsonStreamEvent>): JsonValue {
  const state: BuildState = { stack: [], root: undefined }

  for (const event of events) {
    applyEvent(state, event)
  }

  return finalizeState(state)
}

// #endregion

// #region Asynchronous AST builder

export async function buildValueFromEventsAsync(events: AsyncIterable<JsonStreamEvent>): Promise<JsonValue> {
  const state: BuildState = { stack: [], root: undefined }

  for await (const event of events) {
    applyEvent(state, event)
  }

  return finalizeState(state)
}

// #endregion

// #region Shared event handlers

function applyEvent(state: BuildState, event: JsonStreamEvent): void {
  const { stack } = state

  switch (event.type) {
    case 'startObject': {
      const obj: JsonObject = {}
      const quotedKeys = new Set<string>()

      if (stack.length === 0) {
        // Root object
        stack.push({ type: 'object', obj, quotedKeys })
      }
      else {
        const parent = stack[stack.length - 1]!
        if (parent.type === 'object') {
          if (parent.currentKey === undefined) {
            throw new Error('Object startObject event without preceding key')
          }

          parent.obj[parent.currentKey] = obj
          parent.currentKey = undefined
        }
        else if (parent.type === 'array') {
          parent.arr.push(obj)
        }

        stack.push({ type: 'object', obj, quotedKeys })
      }

      break
    }

    case 'endObject': {
      if (stack.length === 0) {
        throw new Error('Unexpected endObject event')
      }

      const context = stack.pop()!
      if (context.type !== 'object') {
        throw new Error('Mismatched endObject event')
      }

      // Attach quoted keys metadata if any keys were quoted
      if (context.quotedKeys.size > 0) {
        Object.defineProperty(context.obj, QUOTED_KEY_MARKER, {
          value: context.quotedKeys,
          enumerable: false,
          writable: false,
          configurable: false,
        })
      }

      if (stack.length === 0) {
        state.root = context.obj
      }

      break
    }

    case 'startArray': {
      const arr: JsonValue[] = []

      if (stack.length === 0) {
        // Root array
        stack.push({ type: 'array', arr })
      }
      else {
        const parent = stack[stack.length - 1]!
        if (parent.type === 'object') {
          if (parent.currentKey === undefined) {
            throw new Error('Array startArray event without preceding key')
          }
          parent.obj[parent.currentKey] = arr
          parent.currentKey = undefined
        }
        else if (parent.type === 'array') {
          parent.arr.push(arr)
        }

        stack.push({ type: 'array', arr })
      }

      break
    }

    case 'endArray': {
      if (stack.length === 0) {
        throw new Error('Unexpected endArray event')
      }

      const context = stack.pop()!
      if (context.type !== 'array') {
        throw new Error('Mismatched endArray event')
      }

      if (stack.length === 0) {
        state.root = context.arr
      }

      break
    }

    case 'key': {
      if (stack.length === 0) {
        throw new Error('Key event outside of object context')
      }

      const parent = stack[stack.length - 1]!
      if (parent.type !== 'object') {
        throw new Error('Key event in non-object context')
      }

      parent.currentKey = event.key

      // Track quoted keys for path expansion
      if (event.wasQuoted) {
        parent.quotedKeys.add(event.key)
      }

      break
    }

    case 'primitive': {
      if (stack.length === 0) {
        // Root primitive
        state.root = event.value
      }
      else {
        const parent = stack[stack.length - 1]!
        if (parent.type === 'object') {
          if (parent.currentKey === undefined) {
            throw new Error('Primitive event without preceding key in object')
          }
          parent.obj[parent.currentKey] = event.value
          parent.currentKey = undefined
        }
        else if (parent.type === 'array') {
          parent.arr.push(event.value)
        }
      }

      break
    }
  }
}

function finalizeState(state: BuildState): JsonValue {
  if (state.stack.length !== 0) {
    throw new Error('Incomplete event stream: stack not empty at end')
  }

  if (state.root === undefined) {
    throw new Error('No root value built from events')
  }

  return state.root
}

// #endregion
