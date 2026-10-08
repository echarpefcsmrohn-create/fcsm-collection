export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // DA rétro 80-90 : bleu nuit, jaune Sochaux, blanc cassé
        jaune: '#FFC800',
        jaune2: '#D9A800',
        bleu: '#1A3A9E',
        bleu2: '#06103A',
        noir: '#0B1B5A',
        surface: '#06103A',
        surface2: '#0E2272',
        surface3: '#16307F',
        bord: '#2B3F9A',
        muted: '#A9B6E8',
        argent: '#F4EFE0',
        creme: '#F4EFE0',
        victoire: '#2E9E57',
        defaite: '#D6362B',
      },
      fontFamily: {
        // 'bebas' garde son nom pour ne rien casser : c'est maintenant Big Shoulders Display
        bebas: ['"Big Shoulders Display"', '"Bebas Neue"', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      }
    }
  },
  plugins: []
}
