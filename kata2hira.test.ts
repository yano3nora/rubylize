import { assertEquals } from 'https://deno.land/std@0.105.0/testing/asserts.ts'
import { kata2hira } from './kata2hira.ts'

Deno.test('kata2hira test', () => {
  assertEquals(
    kata2hira('Hello World.／(コンニチハ、素晴らしいセカイ。)'),
    'Hello World.／(こんにちは、素晴らしいせかい。)'
  )
})
