import { STATUS_CODES } from 'http'

export default class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = STATUS_CODES[code]
  }
}
