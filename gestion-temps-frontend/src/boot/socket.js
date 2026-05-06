import { boot } from 'quasar/wrappers'
import { io } from 'socket.io-client'

const socket = io('https://feuille-de-temps.onrender.com');

export default boot(({ app }) => {
  app.config.globalProperties.$socket = socket
})

export { socket }
