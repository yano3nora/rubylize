import { assertEquals } from 'https://deno.land/std@0.105.0/testing/asserts.ts'
import { rubylizer } from "./rubylizer.ts"

Deno.test({
  name: 'tokenizer test',
  fn: async () => {
    const actual = await rubylizer('こんにちは、世界。')
    const expect = 'こんにちは、<ruby>世界<rt>せかい</rt></ruby>。'

    assertEquals(actual, expect)
  },

  /**
   * https://github.com/denoland/deno/issues/22470
   * https://docs.deno.com/runtime/manual/basics/testing/sanitizers#resource-sanitizer
   */
  sanitizeResources: false,
})
