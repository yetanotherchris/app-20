export interface IpcContract {
  'app:get-version': {
    request: void
    response: { version: string }
  }
}

export type IpcChannel = keyof IpcContract
