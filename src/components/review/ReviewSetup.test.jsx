import { render, screen, fireEvent } from "@testing-library/react";
import ReviewSetup from "./ReviewSetup";

const summary = {
  pending_instances: 3, pending_images: 1, reviewed_instances: 0, open_rejections: 0,
  strategies: [
    { key: "hierarchy", label: "By hierarchy", description: "", default_direction: "asc" },
    { key: "confidence", label: "Confidence", description: "", default_direction: "asc" },
    { key: "uncertainty", label: "Uncertainty", description: "", default_direction: "desc" },
  ],
};

test("choosing an ordering preselects its default direction", () => {
  const onStart = vi.fn();
  render(<ReviewSetup summary={summary} labels={[]} building={false} onStart={onStart} />);

  fireEvent.change(screen.getByRole("combobox"), { target: { value: "uncertainty" } });
  fireEvent.click(screen.getByRole("button", { name: /Start reviewing/ }));
  expect(onStart).toHaveBeenLastCalledWith(
    expect.objectContaining({ sortStrategy: "uncertainty", direction: "desc" })
  );

  fireEvent.change(screen.getByRole("combobox"), { target: { value: "confidence" } });
  fireEvent.click(screen.getByRole("button", { name: /Start reviewing/ }));
  expect(onStart).toHaveBeenLastCalledWith(
    expect.objectContaining({ sortStrategy: "confidence", direction: "asc" })
  );
});

test("the help note links to the review queue docs", () => {
  render(<ReviewSetup summary={summary} labels={[]} building={false} onStart={vi.fn()} />);
  const link = screen.getByRole("link", { name: /Learn more about it here/ });
  expect(link.getAttribute("href")).toMatch(/review-and-correct\/#setting-up-a-review-queue$/);
});
