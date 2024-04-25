import { tokenize } from 'npm:kuromojin@3.0.0'
import { kata2hira } from './kata2hira.ts'

export const rubylizer = async (input = '') => {
  let output = ''

  await tokenize(input).then(tokens => {
    tokens.forEach(token => {
      // 漢字のトークンだけにふりがなを振る
      if (
        token.pos === '名詞' &&
        token.pos_detail_1 === '一般' &&
        token.word_type === 'KNOWN'
      ) {
        const ruby = kata2hira(token.reading)
        output += `<ruby>${token.surface_form}<rt>${ruby}</rt></ruby>`
      } else {
        output += token.surface_form
      }
    })
  })

  return output
}
