import { assertEquals } from 'https://deno.land/std@0.105.0/testing/asserts.ts'
import { rubylizer } from "./rubylizer.ts"

Deno.test({
  name: 'tokenizer test',
  fn: async () => {
    assertEquals(
      await rubylizer('こんにちは、世界。'),
      'こんにちは、<ruby>世界<rt>せかい</rt></ruby>。',
    )
    assertEquals(
      await rubylizer('かっこつきの「漢字」のテスト。'),
      'かっこつきの「<ruby>漢字<rt>かんじ</rt></ruby>」のテスト。',
    )
    assertEquals(
      await rubylizer('日本の少子高齢化。'),
      '<ruby>日本<rt>にっぽん</rt></ruby>の<ruby>少子<rt>しょうし</rt></ruby><ruby>高齢<rt>こうれい</rt></ruby><ruby>化<rt>か</rt></ruby>。',
    )
    assertEquals(
      await rubylizer('あい　うえお【凸凹】123、４５６, ◯✕・とか'),
      'あい　うえお【<ruby>凸凹<rt>おうとつ</rt></ruby>】123、４５６, ◯✕・とか',
    )
  },

  /**
   * https://github.com/denoland/deno/issues/22470
   * https://docs.deno.com/runtime/manual/basics/testing/sanitizers#resource-sanitizer
   */
  sanitizeResources: false,
})
