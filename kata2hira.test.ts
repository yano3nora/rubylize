import { assertEquals } from '@std/assert'
import { kata2hira } from './kata2hira.ts'

Deno.test('kata2hira test', () => {
  assertEquals(
    kata2hira('Hello World.／(コンニチハ、素晴らしいセカイ。)'),
    'Hello World.／(こんにちは、素晴らしいせかい。)',
  )
})
