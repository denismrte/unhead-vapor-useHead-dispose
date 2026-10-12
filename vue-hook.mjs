// Node has no Vapor runtime in vue's `node` export (index.mjs -> CJS build). Resolve every `vue` import,
// including the one inside @unhead/vue, to the single-file browser ESM build that carries runtime-vapor,
// so the app, the components and @unhead/vue share one Vue instance.
import { registerHooks } from 'node:module'
const target = new URL('./node_modules/vue/dist/vue.runtime-with-vapor.esm-browser.js', import.meta.url).href
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'vue') return { url: target, shortCircuit: true, format: 'module' }
    return next(specifier, context)
  },
})
