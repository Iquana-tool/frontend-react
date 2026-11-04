import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import JoinPage from "./JoinPage";
import * as api from "../api";

const login = vi.fn();
const navigate = vi.fn();

vi.mock("../api", () => ({
  previewRegistrationLink: vi.fn(),
  registerWithLink: vi.fn(),
}));
vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ login }) }));
vi.mock("../hooks/useInstance", () => ({
  useInstance: () => ({ instance: { name: "Reef Lab", contact: "admin@reef.org" }, loading: false }),
  contactHref: (contact) => `mailto:${contact}`,
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const renderAt = (token = "tok") => render(
  <MemoryRouter initialEntries={[`/join/${token}`]}>
    <Routes><Route path="/join/:token" element={<JoinPage />} /></Routes>
  </MemoryRouter>
);

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => vi.clearAllMocks());

test("registers with the link, then signs the new account in", async () => {
  api.previewRegistrationLink.mockResolvedValue({ invite: { is_valid: true, invited_by: "root", expires_at: null } });
  api.registerWithLink.mockResolvedValue({ success: true });
  renderAt("abc");
  expect(await screen.findByText("root invited you to Reef Lab.")).toBeInTheDocument();
  fill("Username", " anna ");
  fill("Password", "correct horse");
  fill("Repeat password", "correct horse");
  fireEvent.click(screen.getByRole("button", { name: /Create account/ }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/datasets", { replace: true }));
  expect(api.registerWithLink).toHaveBeenCalledWith("abc", "anna", "correct horse");
  expect(login).toHaveBeenCalledWith("anna", "correct horse");
});

test("a mismatched or short password is caught before anything is sent", async () => {
  api.previewRegistrationLink.mockResolvedValue({ invite: { is_valid: true, invited_by: "root" } });
  renderAt();
  await screen.findByLabelText("Username");
  fill("Username", "anna");
  fill("Password", "short");
  fill("Repeat password", "short");
  fireEvent.click(screen.getByRole("button", { name: /Create account/ }));
  expect(await screen.findByText(/at least 8 characters/)).toBeInTheDocument();
  fill("Password", "correct horse");
  fill("Repeat password", "correct horsf");
  fireEvent.click(screen.getByRole("button", { name: /Create account/ }));
  expect(await screen.findByText(/do not match/)).toBeInTheDocument();
  expect(api.registerWithLink).not.toHaveBeenCalled();
});

test("a used-up link says so and points at the contact instead of showing the form", async () => {
  api.previewRegistrationLink.mockResolvedValue({ invite: { is_valid: false, invited_by: "root" } });
  renderAt();
  expect(await screen.findByText(/expired, was revoked, or has already been used/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "admin@reef.org" })).toBeInTheDocument();
});

test("an unknown link shows the server's message", async () => {
  api.previewRegistrationLink.mockRejectedValue(new Error("API Error: This registration link does not exist."));
  renderAt();
  expect(await screen.findByText("This registration link does not exist.")).toBeInTheDocument();
});
