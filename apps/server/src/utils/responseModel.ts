export class ResponseModel {
  static readonly CODE: {
    SUCCESS: 200
    UNAUTHORIZED: 401
    NOT_FOUND: 404
    INTERNAL_SERVER_ERROR: 500

    CHECK_PARAMS_ERROR: 461
    VALIDATE_ERROR: 462
    UNKNOWN_ERROR: 463
  } = {
    SUCCESS: 200,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,

    CHECK_PARAMS_ERROR: 461,
    VALIDATE_ERROR: 462,
    UNKNOWN_ERROR: 463,
  }

  private result: {
    code: number
    message: string
    data?: any
  }

  constructor(
    code: number = ResponseModel.CODE.SUCCESS,
    message: string = 'success',
    data?: any,
  ) {
    this.result = {
      code,
      message,
      data,
    }
  }

  setError(code: number, message: string) {
    this.result.code = code
    this.result.message = message

    return this
  }

  setData(data: any) {
    this.result.data = data

    return this
  }

  getResult() {
    return this.result
  }
}
