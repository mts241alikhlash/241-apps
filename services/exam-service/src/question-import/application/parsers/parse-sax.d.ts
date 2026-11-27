declare module 'exceljs/lib/utils/parse-sax.js' {
  interface SaxEvent {
    eventType: 'opentag' | 'text' | 'closetag'
    value: unknown
  }

  export default function parseSax(
    iterable:
      Iterable<string | Uint8Array> | AsyncIterable<string | Uint8Array>,
  ): AsyncGenerator<SaxEvent[]>
}
