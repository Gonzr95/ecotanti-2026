import { definePreset } from '@openng/optimus-ui-themes';
import Aura from '@openng/optimus-ui-themes/aura';

/**
 * Tema centralizado para EcoTanti Backoffice.
 * Extiende el preset Aura de Optimus UI configurando:
 * - Paleta Primaria: Indigo (50 - 950)
 * - Paleta de Superficie Dark: Slate (0 - 950)
 * - Tokens de Campos de Formulario: Fondo slate-950, bordes slate-800, foco en índigo, esquinas 'xl'
 * - Tokens de Componentes: Esquinas redondeadas 'xl' (12px) consistentes
 */
export const BackofficeTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}',
    },
    formField: {
      borderRadius: '{border.radius.xl}',
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
        formField: {
          background: '{surface.950}',
          borderColor: '{surface.800}',
          hoverBorderColor: '{surface.700}',
          focusBorderColor: '{primary.color}',
          color: '{surface.100}',
          placeholderColor: '{surface.500}',
        },
        content: {
          background: '{surface.900}',
          borderColor: '{surface.800}',
          color: '{surface.100}',
        },
      },
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '{border.radius.xl}',
      },
    },
  },
});

