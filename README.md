# `useHead` entries from Vue Vapor components are not disposed on unmount

Reproduction for `@unhead/vue` 3.4.2 with `vue` 3.6.0-rc.10 (Vapor, `vaporInteropPlugin`), in Node with happy-dom.

```sh
pnpm install
node repro.mjs   # exit 1 = a Vapor arm leaks its head entry, 0 = none does
```

Four arms: a VDOM child (control), a `defineVaporComponent` child, a `<script setup vapor>` child compiled by `@vue/compiler-sfc` (`build.mjs`), and a Vapor child that adds `onScopeDispose(() => entry.dispose())` (fix direction). `vue-hook.mjs` maps `vue` to the runtime-with-vapor browser build, since the Node build of `vue` has no Vapor runtime. Logs of two runs are in `results/`.
