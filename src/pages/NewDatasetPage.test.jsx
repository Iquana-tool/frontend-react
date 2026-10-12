import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewDatasetPage from './NewDatasetPage';
import { DRAFT_STORAGE_KEY, initialDraft, serializeDraft } from '../components/datasets/creation/wizardModel';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { username: 'r.leist' } }) }));
vi.mock('../contexts/DatasetContext', () => ({
  useDataset: () => ({ datasets: [{ id: 3, name: 'Reef A' }], fetchDatasets: vi.fn() }),
}));
vi.mock('../hooks/usePermissions', () => ({ usePermissions: () => ({ canCreateDatasets: true, globalRole: 'member' }) }));
vi.mock('../components/ui/DocsLink', () => ({ default: () => null }));
vi.mock('../components/ui/ThemeToggle', () => ({ default: () => null }));
vi.mock('../api/quantifications', () => ({
  getMetricsCatalog: vi.fn().mockResolvedValue({
    metrics: [
      { key: 'area', name: 'Area', tier: 'geometry', unit_kind: 'area' },
      { key: 'circularity', name: 'Circularity', tier: 'geometry', unit_kind: 'ratio' },
      { key: 'mean_color_lab', name: 'Mean color (CIELAB)', tier: 'appearance', unit_kind: 'color' },
    ],
  }),
  getQuantificationProfiles: vi.fn(),
  createQuantificationProfile: vi.fn(),
}));
vi.mock('../api/calibration', () => ({
  fetchCalibrationKinds: vi.fn().mockResolvedValue({
    kinds: [
      { kind: 'scale', label: 'Scale', affects_metrics: ['area'], strategies: [] },
      { kind: 'response', label: 'Color & intensity', affects_metrics: ['mean_color_lab'],
        strategies: [{ strategy: 'gray_wedge', label: 'Reference card', summary: '', requires_card: false }] },
    ],
  }),
  fetchDatasetCalibrationDefaults: vi.fn(),
  fetchImageCalibrations: vi.fn(),
  setDatasetCalibrationDefaults: vi.fn(),
}));
vi.mock('../api/label_space', () => ({
  getLabelSpaceConfig: vi.fn().mockResolvedValue({ enabled: false }),
  generateLabelSpace: vi.fn(),
  applyLabelSpace: vi.fn(),
}));
vi.mock('../api/organizations', () => ({
  fetchOrganizations: vi.fn().mockResolvedValue({ organizations: [{ id: 1, my_role: 'member' }] }),
  fetchOrganizationMembers: vi.fn().mockResolvedValue({
    members: [{ username: 'r.leist', display_name: null }, { username: 'ann', display_name: 'Ann A' }],
  }),
}));
vi.mock('../api/stacks', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchStackFormats: vi.fn().mockResolvedValue({ extensions: ['.e2e', '.vol'] }),
}));

const renderPage = () => render(<MemoryRouter><NewDatasetPage /></MemoryRouter>);
const rail = () => screen.getByRole('navigation', { name: 'Dataset setup steps' });
const railButton = (name) => within(rail()).getByRole('button', { name: new RegExp(name) });

describe('NewDatasetPage', () => {
  beforeEach(() => localStorage.clear());

  it('starts on the template step with unavailable templates disabled', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Start from a template' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Radiology/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Saved templates/ })).toBeDisabled();
    // Steps the backend cannot do yet carry their issue number in the rail.
    expect(within(railButton('Embedding model')).getByText('#33')).toBeInTheDocument();
    expect(within(railButton('Existing annotations')).getByText('#60')).toBeInTheDocument();
  });

  it('a template marks the steps it fills', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /Standardized lab imaging/ }));
    expect(within(railButton('Calibration profile')).getByText('TPL')).toBeInTheDocument();
    expect(screen.getByText(/fills 4 of 12 steps/)).toBeInTheDocument();
  });

  it('creating needs a title, and the draft is kept', async () => {
    renderPage();
    const create = within(rail()).getByRole('button', { name: /Create now, configure later/ });
    expect(create).toBeDisabled();

    fireEvent.click(railButton('Basics'));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Retina study' } });
    expect(within(rail()).getByRole('button', { name: /Create now, configure later/ })).toBeEnabled();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)).basics.title).toBe('Retina study'));
  });

  it('reading the scale from the scan file needs OCT files or the OCT domain', async () => {
    renderPage();
    fireEvent.click(railButton('Calibration profile'));
    expect(await screen.findByRole('radio', { name: /From the scan file/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /From a DICOM header/ })).toBeDisabled();

    fireEvent.click(railButton('Basics'));
    fireEvent.click(screen.getByRole('radio', { name: /Ophthalmology/ }));
    fireEvent.click(railButton('Calibration profile'));
    const fromFile = screen.getByRole('radio', { name: /From the scan file/ });
    expect(fromFile).toBeEnabled();
    expect(fromFile).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the calibrations the chosen metrics imply', async () => {
    renderPage();
    fireEvent.click(railButton('Quantification profile'));
    const colour = await screen.findByRole('checkbox', { name: /Mean color/ });
    expect(screen.getByText(/area · needs scale/)).toBeInTheDocument();
    fireEvent.click(colour);
    expect(screen.getByText('Color & intensity')).toBeInTheDocument();
  });

  it('names an option by its title and describes it with the rest', async () => {
    renderPage();
    fireEvent.click(railButton('Calibration profile'));
    const known = await screen.findByRole('radio', { name: 'Known value' });
    expect(known).toHaveAccessibleDescription(/Type the pixel size now/);
    expect(screen.getByRole('radio', { name: 'From a DICOM header' })).toHaveAccessibleDescription(/DICOM files cannot be read yet/);
  });

  it('a restored draft says on the first screen that queued files were not kept', async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft({
      ...initialDraft(),
      basics: { ...initialDraft().basics, title: 'Reef B' },
      images: { files: [{ name: 'a.png' }, { name: 'b.png' }] },
    }));
    renderPage();
    expect(screen.getByText(/2 queued files were not kept in the draft/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add them again' }));
    expect(screen.getByText(/Your draft had 2 files queued/)).toBeInTheDocument();
  });

  it('suggests organisation members and flags names outside them before creation', async () => {
    renderPage();
    fireEvent.click(railButton('Access & roles'));
    const input = screen.getByLabelText('Username');
    await waitFor(() => expect(input).toHaveAttribute('list'));
    const suggestions = [...document.getElementById(input.getAttribute('list')).options].map((option) => option.value);
    // The caller is the owner, so only the other member is suggested.
    expect(suggestions).toEqual(['ann']);

    for (const name of ['ann', 'ghost']) {
      fireEvent.change(input, { target: { value: name } });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    }
    expect(screen.getAllByText(/Not a member of your organisations/)).toHaveLength(1);
    expect(screen.getByText('ghost').closest('li')).toHaveTextContent(/Not a member of your organisations/);
  });

  it('marks multi-mask annotation and extra reviewers as not available', () => {
    renderPage();
    fireEvent.click(railButton('Annotation profile'));
    expect(screen.getByRole('radio', { name: /One mask per annotator/ })).toBeDisabled();
    fireEvent.click(railButton('Review profile'));
    expect(screen.getByText('#61')).toBeInTheDocument();
  });
});
