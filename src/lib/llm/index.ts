import { StreamChunk } from "./types";

const formatSSE = (chunk: StreamChunk): string => (`data: ${JSON.stringify(chunk)}\n\n`);

export function CreateResponseStream(generator: AsyncGenerator<StreamChunk>) {
    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of generator) {
                controller.enqueue(new TextEncoder().encode(formatSSE(chunk)));
            }
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        }
    })
}