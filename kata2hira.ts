/**
 * カタカナをひらがなに変換
 *
 * @param {string} katakana
 * @return {string} hiragana
 */
export const kata2hira = (katakana: string) => (
  katakana.replace(/[\u30a1-\u30f6]/g, match =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  )
)
