import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegistrationLinksPanel from "./RegistrationLinksPanel";
import * as api from "../../api";

vi.mock("../../api", () => ({
  fetchAccountInvites: vi.fn(),
  createAccountInvite: vi.fn(),
  revokeAccountInvite: vi.fn(),
}));
vi.mock("../../api/config", () => ({ BASE_PATH: "" }));

beforeEach(() => vi.clearAllMocks());

test("creates a single-use link by default and shows it once", async () => {
  api.fetchAccountInvites.mockResolvedValue({ invites: [] });
  api.createAccountInvite.mockResolvedValue({ invite_path: "/join/tok123", invite: { note: "Anna" } });
  render(<RegistrationLinksPanel />);
  fireEvent.change(await screen.findByLabelText("For"), { target: { value: " Anna " } });
  fireEvent.click(screen.getByRole("button", { name: /Create registration link/ }));
  await waitFor(() => expect(api.createAccountInvite).toHaveBeenCalledWith(
    { expires_in_hours: 168, max_uses: 1, note: "Anna" }));
  expect(screen.getByLabelText("Registration link")).toHaveValue(`${window.location.origin}/join/tok123`);
});

test("lists active links and revokes one", async () => {
  api.fetchAccountInvites.mockResolvedValueOnce({ invites: [
    { id: 4, note: "Bob", uses: 0, max_uses: 1, expires_at: null, created_by: "root" },
  ] }).mockResolvedValue({ invites: [] });
  api.revokeAccountInvite.mockResolvedValue({ success: true });
  render(<RegistrationLinksPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "Revoke Bob" }));
  await waitFor(() => expect(api.revokeAccountInvite).toHaveBeenCalledWith(4));
  expect(await screen.findByText("No active registration links.")).toBeInTheDocument();
});
