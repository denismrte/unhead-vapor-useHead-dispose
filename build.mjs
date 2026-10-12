// Compiles Child.vue (`<script setup vapor>`) for the client, as @vitejs/plugin-vue does, into out/Child.mjs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { parse, compileScript } from '@vue/compiler-sfc'
const { descriptor } = parse(readFileSync(new URL('./Child.vue', import.meta.url), 'utf8'), { filename: 'Child.vue' })
if (!descriptor.vapor) throw new Error('Child.vue was not parsed as a Vapor SFC')
const { content } = compileScript(descriptor, { id: 'child', inlineTemplate: true, isProd: false })
mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(new URL('./out/Child.mjs', import.meta.url), content)
