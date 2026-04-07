import { boot } from 'quasar/wrappers'
import dayjs from 'dayjs'

// plugins
import relativeTime from 'dayjs/plugin/relativeTime'

// langue française
import 'dayjs/locale/fr'

// activer plugins
dayjs.extend(relativeTime)
dayjs.locale('fr')

export default boot(({ app }) => {
  app.config.globalProperties.$dayjs = dayjs
})

export { dayjs }
