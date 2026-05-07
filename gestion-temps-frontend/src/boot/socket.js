import { boot } from 'quasar/wrappers'
import { io } from 'socket.io-client'

const socketBaseUrl = import.meta.env.VITE_SOCKET_BASE_URL || 'http://localhost:3000'
const socket = io(socketBaseUrl)

export default boot(({ app }) => {
  app.config.globalProperties.$socket = socket
})

export { socket }
