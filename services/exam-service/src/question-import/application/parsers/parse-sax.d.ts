declare module 'exceljs/lib/utils/parse-sax.js' {
  type SaxEvent =
    | {
        eventType: 'opentag'
        value: { name: string; attributes: Record<string, string | undefined> }
      }
    | { eventType: 'closetag'; value: { name: string } }
    | { eventType: 'text'; value: string }

  export default function parseSax(
    iterable:
      Iterable<string | Uint8Array> | AsyncIterable<string | Uint8Array>,
  ): AsyncGenerator<SaxEvent[]>
}
