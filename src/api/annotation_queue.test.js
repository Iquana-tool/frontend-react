import {
  buildAnnotationQueue,
  prepareAnnotationQueue,
  fetchQueuePrepJob,
  cancelQueuePrepJob,
  fetchScoringModels,
} from "./annotation_queue";

const okJson = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

describe("annotation queue api", () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => okJson({ success: true }));
  });

  test("build sends strategy and model", async () => {
    await buildAnnotationQueue(3, { strategy: "mix", model_key: "m1" });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/annotation-queue\/datasets\/3$/);
    expect(JSON.parse(options.body)).toEqual({ strategy: "mix", model_key: "m1" });
  });

  test("prepare posts to the prepare route", async () => {
    await prepareAnnotationQueue(3, { strategy: "uncertainty", model_key: "m1" });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/annotation-queue\/datasets\/3\/prepare$/);
    expect(options.method).toBe("POST");
  });

  test("job status, cancel and scoring models hit their routes", async () => {
    await fetchQueuePrepJob(3, 9);
    await cancelQueuePrepJob(3, 9);
    await fetchScoringModels(3);
    const urls = global.fetch.mock.calls.map(([url]) => url);
    expect(urls[0]).toMatch(/\/datasets\/3\/prep-jobs\/9$/);
    expect(urls[1]).toMatch(/\/datasets\/3\/prep-jobs\/9\/cancel$/);
    expect(urls[2]).toMatch(/\/datasets\/3\/scoring-models$/);
  });
});
