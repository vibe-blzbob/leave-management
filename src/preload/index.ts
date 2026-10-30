import { contextBridge, ipcRenderer } from 'electron'
import { methods, type Api } from '../shared/types'

// Every DB call goes through one 'db' channel; main whitelists the method name.
const api = Object.fromEntries(
  methods.map((m) => [m, (...args: unknown[]) => ipcRenderer.invoke('db', m, ...args)])
) as unknown as Api

contextBridge.exposeInMainWorld('api', api)
