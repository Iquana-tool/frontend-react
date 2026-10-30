import {
  buildAnnotationQueue,
  prepareAnnotationQueue,
  fetchQueuePrepJob,
  cancelQueuePrepJob,
  fetchQueueModels,
} from "./annotation_queue";

const okJson = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

describe("annotation queue api", () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => okJson({ success: true }));
  });

  test("build sends the settings", async () => {
    const settings = { method: "density", embedding_model: "bioclip-2", show_builder: false };
    await buildAnnotationQueue(3, settings);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/annotation-queue\/datasets\/3$/);
    expect(JSON.parse(options.body)).toEqual(settings);
  });

  test("prepare posts to the prepare route", async () => {
    await prepareAnnotationQueue(3, { method: "uncertainty", trained_model: "m1" });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/annotation-queue\/datasets\/3\/prepare$/);
    expect(options.method).toBe("POST");
  });

  test("job status, cancel and scoring models hit their routes", async () => {
    await fetchQueuePrepJob(3, 9);
    await cancelQueuePrepJob(3, 9);
    await fetchQueueModels(3);
    const urls = global.fetch.mock.calls.map(([url]) => url);
    expect(urls[0]).toMatch(/\/datasets\/3\/prep-jobs\/9$/);
    expect(urls[1]).toMatch(/\/datasets\/3\/prep-jobs\/9\/cancel$/);
    expect(urls[2]).toMatch(/\/datasets\/3\/models$/);
  });
});
