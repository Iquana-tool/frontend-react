import { render, screen } from "@testing-library/react";
import AccountRequestNote from "./AccountRequestNote";

test("points at the instance contact, as a mail link when it is an address", () => {
  render(<AccountRequestNote instance={{ contact: "reef-admin@example.org" }} />);
  expect(screen.getByRole("link", { name: "reef-admin@example.org" }).getAttribute("href"))
    .toBe("mailto:reef-admin@example.org");
});

test("without a contact it says accounts come from the administrator", () => {
  render(<AccountRequestNote instance={{ contact: null }} />);
  expect(screen.getByText(/issued by its administrator/)).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
