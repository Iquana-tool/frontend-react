import { INSTANCE_WRITE_MODES, MessageBuilders } from './messageTypes';

describe('MessageBuilders.runInstance', () => {
  test('defaults interactive inference to patch mode', () => {
    const message = MessageBuilders.runInstance('instance-model');

    expect(message.data).toEqual({
      model_registry_key: 'instance-model',
      write_mode: INSTANCE_WRITE_MODES.PATCH,
    });
  });

  test('includes inputs in websocket payload when provided', () => {
    const message = MessageBuilders.runInstance(
      'instance-model',
      INSTANCE_WRITE_MODES.PATCH,
      { parameters: { threshold: 0.75 } }
    );

    expect(message.data).toEqual({
      model_registry_key: 'instance-model',
      write_mode: INSTANCE_WRITE_MODES.PATCH,
      inputs: { parameters: { threshold: 0.75 } },
    });
  });
});

describe('MessageBuilders.runSegmentation', () => {
  test('builds payload without inputs when none provided', () => {
    const message = MessageBuilders.runSegmentation('sam-model', {
      point_prompts: [{ x: 0.1, y: 0.2, label: true }],
    });

    expect(message.data).toEqual({
      model_identifier: 'sam-model',
      model_key: 'sam-model',
      prompts: {
        point_prompts: [{ x: 0.1, y: 0.2, label: true }],
        box_prompt: null,
        polygon_prompt: null,
        circle_prompt: null,
      },
    });
  });

  test('includes inputs in websocket payload when provided', () => {
    const message = MessageBuilders.runSegmentation(
      'sam-model',
      { point_prompts: [{ x: 0.1, y: 0.2, label: true }] },
      { parameters: { threshold: 0.9 } }
    );

    expect(message.data).toEqual({
      model_identifier: 'sam-model',
      model_key: 'sam-model',
      prompts: {
        point_prompts: [{ x: 0.1, y: 0.2, label: true }],
        box_prompt: null,
        polygon_prompt: null,
        circle_prompt: null,
      },
      inputs: {
        parameters: { threshold: 0.9 },
      },
    });
  });
});

describe('MessageBuilders.runSuggestion', () => {
  test('builds payload without inputs when none provided', () => {
    const message = MessageBuilders.runSuggestion([10, 11], 'sam3-sugg', 2);

    expect(message.data).toEqual({
      seed_contour_ids: [10, 11],
      model_key: 'sam3-sugg',
      label_id: 2,
    });
  });

  test('includes inputs in websocket payload when provided', () => {
    const message = MessageBuilders.runSuggestion([10, 11], 'sam3-sugg', 2, {
      parameters: { mask_threshold: 0.8 },
      conditioning: { count: 4 },
    });

    expect(message.data).toEqual({
      seed_contour_ids: [10, 11],
      model_key: 'sam3-sugg',
      label_id: 2,
      inputs: {
        parameters: { mask_threshold: 0.8 },
        conditioning: { count: 4 },
      },
    });
  });
});


it('transports an explicit false hierarchy choice without changing legacy messages', () => {
  expect(MessageBuilders.addObject([0,1,1], [0,0,1], null, null, 1, 1,
    { useHierarchy: false }).data.use_hierarchy).toBe(false);
  expect(MessageBuilders.addObject([0,1,1], [0,0,1]).data).not.toHaveProperty('use_hierarchy');
});

it('forwards model_class when adding an object with model class options', () => {
  const msg = MessageBuilders.addObject([0,1,1], [0,0,1], 'coral', null, 0.95, 43, {
    modelClass: 'acropora',
    modelKey: 'species_model',
  });
  expect(msg.data.model_class).toBe('acropora');
  expect(msg.data.model_key).toBe('species_model');
});
