// A VDOM app with vaporInteropPlugin toggles a child with v-if. The child calls
// useHead({ title: 'child', meta: [{ name: 'robots', content: 'noindex' }] }).
// After the child unmounts and the head is flushed, its tags must be gone.
// Exit 0: defect absent (every Vapor arm cleans up). Exit 1: defect present. Exit 2: rig broken (control arm failed).
process.on('uncaughtException', (e) => { console.error(e); process.exit(2) })
import './vue-hook.mjs'
import { Window } from 'happy-dom'
import { readFileSync } from 'node:fs'
import './build.mjs'

const window = new Window({ url: 'http://localhost/' })
for (const k of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'Text', 'Comment', 'DocumentFragment', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame'])
  Object.defineProperty(globalThis, k, { value: k === 'window' ? window : window[k], configurable: true, writable: true })

const vue = await import('vue')
const { createApp, defineComponent, defineVaporComponent, vaporInteropPlugin, h, ref, nextTick, onScopeDispose, getCurrentInstance, getCurrentScope, version } = vue
const { createHead, renderDOMHead } = await import('@unhead/vue/client')
const { useHead } = await import('@unhead/vue')
const { default: SfcChild } = await import('./out/Child.mjs')

const pkg = (name) => JSON.parse(readFileSync(new URL(`./node_modules/${name}/package.json`, import.meta.url), 'utf8')).version
console.log(`vue ${version} · @unhead/vue ${pkg('@unhead/vue')} · unhead ${pkg('unhead')} · happy-dom ${pkg('happy-dom')} · node ${process.version}`)

const input = () => ({ title: 'child', meta: [{ name: 'robots', content: 'noindex' }] })
const probe = {}
const record = (arm) => { probe[arm] = { instance: getCurrentInstance() !== null, scope: getCurrentScope() !== undefined } }

const arms = {
  // control: the same child as a VDOM component
  'vdom (control)': defineComponent({ setup() { record('vdom (control)'); useHead(input()); return () => h('p', 'child') } }),
  // defineVaporComponent; setup returns its block
  'vapor defineVaporComponent': defineVaporComponent({ setup() { record('vapor defineVaporComponent'); useHead(input()); const p = document.createElement('p'); p.textContent = 'child'; return p } }),
  // <script setup vapor> compiled by @vue/compiler-sfc
  'vapor <script setup vapor>': SfcChild,
  // fix direction: the same Vapor child, disposing the entry with onScopeDispose
  'vapor + onScopeDispose (fix direction)': defineVaporComponent({ setup() { record('vapor + onScopeDispose (fix direction)'); const entry = useHead(input()); onScopeDispose(() => entry.dispose()); const p = document.createElement('p'); p.textContent = 'child'; return p } }),
}

const snapshot = (head) => ({
  title: document.title,
  robots: document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
  entries: head.entries.size,
  childInDom: document.querySelector('#app p') !== null,
})
const flush = async (head) => { await nextTick(); await new Promise((r) => setTimeout(r, 10)); await renderDOMHead(head, { document }) }

const results = {}
for (const [arm, Child] of Object.entries(arms)) {
  document.head.innerHTML = ''
  document.title = ''
  document.body.innerHTML = '<div id="app"></div>'
  const head = createHead()
  const show = ref(true)
  const app = createApp(defineComponent({
    setup() {
      useHead({ title: 'parent' })
      return () => h('div', [show.value ? h(Child) : null])
    },
  }))
  app.use(head)
  app.use(vaporInteropPlugin)
  app.mount('#app')
  await flush(head)
  const mounted = snapshot(head)
  show.value = false
  await flush(head)
  const unmounted = snapshot(head)
  app.unmount()
  const ok = mounted.childInDom && !unmounted.childInDom && mounted.title === 'child' && mounted.robots === 'noindex' && unmounted.title === 'parent' && unmounted.robots === null
  results[arm] = ok
  console.log(`\n[${arm}]`)
  if (probe[arm]) console.log(`  in setup: getCurrentInstance() ${probe[arm].instance ? 'non-null' : 'null'}, getCurrentScope() ${probe[arm].scope ? 'defined' : 'undefined'}`)
  console.log(`  mounted:   title=${JSON.stringify(mounted.title)} robots=${JSON.stringify(mounted.robots)} entries=${mounted.entries} child<p>InDom=${mounted.childInDom}`)
  console.log(`  unmounted: title=${JSON.stringify(unmounted.title)} robots=${JSON.stringify(unmounted.robots)} entries=${unmounted.entries} child<p>InDom=${unmounted.childInDom}`)
  console.log(`  ${ok ? 'PASS: child head tags removed on unmount' : 'FAIL: child head tags remain after unmount'}`)
}

await window.happyDOM.close()
if (!results['vdom (control)']) { console.log('\nVERDICT: rig broken (control arm failed)'); process.exit(2) }
const leaked = ['vapor defineVaporComponent', 'vapor <script setup vapor>'].filter((a) => !results[a])
console.log(leaked.length ? `\nVERDICT: defect present in ${leaked.join(', ')}` : '\nVERDICT: defect absent')
process.exit(leaked.length ? 1 : 0)
