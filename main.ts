import { readAll } from 'https://deno.land/std@0.105.0/io/util.ts'
import { rubylizer } from './rubylizer.ts'

const decoder = new TextDecoder()
const inputData = await readAll(Deno.stdin)
const inputString = decoder.decode(inputData)

try {
  console.log(await rubylizer(inputString))
} catch (error) {
  console.error('Failed to parse input:', error)
}
