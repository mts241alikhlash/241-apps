import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common'
import { firstValueFrom, of } from 'rxjs'
import {
  ResponseEnvelope,
  ResponseInterceptor,
} from './response.interceptor.js'

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>

  beforeEach(() => {
    interceptor = new ResponseInterceptor()
  })

  const createMockContext = (statusCode = 200): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
      }),
    }) as unknown as ExecutionContext

  const createMockHandler = (data: unknown): CallHandler => ({
    handle: () => of(data),
  })

  it('should be defined', () => {
    expect(interceptor).toBeDefined()
  })

  it('should wrap plain data in envelope', async () => {
    const context = createMockContext(200)
    const handler = createMockHandler({ id: 1, name: 'Test' })

    const result = await firstValueFrom(interceptor.intercept(context, handler))
    expect(result).toEqual({
      statusCode: 200,
      message: 'Success',
      data: { id: 1, name: 'Test' },
    })
  })

  it('should auto-reshape paginated repo payload { data, total, page, limit } into { data, meta }', async () => {
    const context = createMockContext(200)
    const handler = createMockHandler({
      data: [{ id: 1 }, { id: 2 }],
      total: 50,
      page: 1,
      limit: 10,
    })

    const result = await firstValueFrom(interceptor.intercept(context, handler))
    expect(result).toEqual({
      statusCode: 200,
      message: 'Success',
      data: [{ id: 1 }, { id: 2 }],
      meta: { total: 50, page: 1, limit: 10 },
    })
  })

  it('should preserve existing envelope with data+meta', async () => {
    const context = createMockContext(200)
    const envelopeData = {
      message: 'Custom message',
      data: [{ id: 1 }],
      meta: { total: 1, page: 1 },
    }
    const handler = createMockHandler(envelopeData)

    const result = await firstValueFrom(interceptor.intercept(context, handler))
    expect(result).toEqual({
      statusCode: 200,
      message: 'Custom message',
      data: [{ id: 1 }],
      meta: { total: 1, page: 1 },
    })
  })

  it('never double-wraps an envelope that carries data but no meta', async () => {
    const context = createMockContext(200)
    const handler = createMockHandler({ data: { employeeId: 'e-1' } })

    const result = await firstValueFrom(interceptor.intercept(context, handler))
    expect(result).toEqual({
      statusCode: 200,
      message: 'Success',
      data: { employeeId: 'e-1' },
    })
  })

  it('omits meta entirely when the payload carries none', async () => {
    const context = createMockContext(200)
    const handler = createMockHandler({ data: [1, 2] })

    const result = await firstValueFrom(interceptor.intercept(context, handler))
    expect('meta' in (result as unknown as Record<string, unknown>)).toBe(false)
  })

  it('should default message to "Success" when envelope has no message', async () => {
    const context = createMockContext(201)
    const handler = createMockHandler({ data: { id: 1 }, meta: {} })

    const result = await firstValueFrom(interceptor.intercept(context, handler))
    expect(result).toEqual({
      statusCode: 201,
      message: 'Success',
      data: { id: 1 },
      meta: {},
    })
  })

  it('should wrap null data in envelope', async () => {
    const context = createMockContext(200)
    const handler = createMockHandler(null)

    const result = await firstValueFrom(interceptor.intercept(context, handler))
    expect(result).toEqual({
      statusCode: 200,
      message: 'Success',
      data: null,
    })
  })

  it('should wrap string data in envelope', async () => {
    const context = createMockContext(200)
    const handler = createMockHandler('hello')

    const result = await firstValueFrom(interceptor.intercept(context, handler))
    expect(result).toEqual({
      statusCode: 200,
      message: 'Success',
      data: 'hello',
    })
  })

  it('should use correct statusCode from response', async () => {
    const context = createMockContext(201)
    const handler = createMockHandler({ id: 1 })

    const result = await firstValueFrom(interceptor.intercept(context, handler))
    const envelope = result as ResponseEnvelope<unknown>
    expect(envelope.statusCode).toBe(201)
  })

  it('should pass StreamableFile through without wrapping', async () => {
    const buffer = Buffer.from('fake xlsx content')
    const streamableFile = new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="test.xlsx"',
    })
    const context = createMockContext(200)
    const handler = createMockHandler(streamableFile)

    const result = await firstValueFrom(interceptor.intercept(context, handler))
    expect(result).toBe(streamableFile)
    expect(result).toBeInstanceOf(StreamableFile)
  })
})
