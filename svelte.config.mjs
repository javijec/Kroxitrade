import preprocess from "svelte-preprocess"

/**
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
  preprocess: preprocess({
    scss: {
      api: "modern-compiler",
    },
  }),
  compilerOptions: {
    css: 'injected',
  }
}

export default config
