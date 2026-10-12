<script setup vapor>
import { useHead } from '@unhead/vue'

useHead({ title: 'child', meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template><p>child</p></template>
