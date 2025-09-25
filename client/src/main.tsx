import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider, extendTheme, defineStyleConfig } from '@chakra-ui/react'
import App from './App'
import './index.css'

const Button = defineStyleConfig({
  defaultProps: { colorScheme: 'blue' }
})

const theme = extendTheme({
  components: { Button },
  styles: {
    global: {
      'html, body, #root': { height: '100%' },
      body: {
        bg: 'var(--tg-bg-color, #0f1115)',
        color: 'var(--tg-text-color, #e5e7eb)',
      },
    },
  },
  colors: {
    blue: {
      500: 'var(--tg-button-color, #2563eb)',
      600: 'var(--tg-button-color, #2563eb)',
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
)
