// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const addDoc = vi.hoisted(() =>
  vi.fn(async (_ref: unknown, _data: unknown) => ({ id: "test-report-id" }))
);
const withConverter = vi.hoisted(() => vi.fn(() => ({ __ref: "reports" })));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ withConverter })),
  addDoc,
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
}));

vi.mock("../../config/firebase", () => ({ db: {} }));

vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({
    executeRecaptcha: vi.fn(async () => "test-recaptcha-token"),
  }),
}));

import Report from "./Report.tsx";

// The campus and building-type selects currently share the exact same label
// text ("Where did you feel unsafe? *"), and the text that distinguishes them
// sits in an unassociated <div>. That makes them indistinguishable by
// accessible name, so these tests address them by id instead.
const campusSelect = () =>
  document.getElementById("campus") as HTMLSelectElement;
const buildingTypeSelect = () =>
  document.getElementById("location") as HTMLSelectElement;

const optionValues = (select: HTMLSelectElement) =>
  within(select)
    .getAllByRole("option")
    .map((option) => (option as HTMLOptionElement).value)
    .filter((value) => value !== "");

/** Walk the form to the review step with a valid minimal report. */
async function fillOutReport(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(campusSelect(), "Notre-Dame");
  await user.selectOptions(buildingTypeSelect(), "Residence Halls");
  await user.click(screen.getByRole("button", { name: /next/i }));

  await user.click(screen.getByRole("radio", { name: /verbal aggression/i }));
  await user.click(screen.getByRole("button", { name: /next/i }));

  await user.selectOptions(
    screen.getByLabelText(/when did this occur/i),
    "within-24-hours"
  );
  await user.click(screen.getByRole("button", { name: /next/i }));
}

describe("Report form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom has no alert; validation failures call it directly.
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("offers real building types, not array indices", () => {
    // `categories` was seeded with Object.values(...) — an array — while the
    // dropdown renders Object.keys(categories), so before a campus was picked
    // the options came out as "0", "1", "2".
    render(<Report />);

    const options = optionValues(buildingTypeSelect());

    expect(options.length).toBeGreaterThan(0);
    expect(options).not.toContain("0");
    expect(options).toContain("Residence Halls");
  });

  it("re-populates building types when the campus changes", async () => {
    const user = userEvent.setup();
    render(<Report />);

    await user.selectOptions(campusSelect(), "Holy-Cross");

    expect(optionValues(buildingTypeSelect())).toEqual(["Academic Buildings"]);
  });

  it("survives a campus whose building list is empty", async () => {
    const user = userEvent.setup();
    render(<Report />);

    // Saint-Marys has no buildings in the directory; selecting a building type
    // used to call .map() on an undefined lookup.
    await user.selectOptions(campusSelect(), "Saint-Marys");

    expect(campusSelect()).toHaveValue("Saint-Marys");
    expect(optionValues(buildingTypeSelect())).toEqual([]);
  });

  it("blocks advancing past step 1 with no location chosen", async () => {
    const user = userEvent.setup();
    render(<Report />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(window.alert).toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /submit anonymous report/i })
    ).not.toBeInTheDocument();
  });

  it("submits a payload carrying createdAt", async () => {
    // The contract that broke /map: Map.tsx reads `createdAt`, so the write
    // must produce that field and not some other name.
    const user = userEvent.setup();
    render(<Report />);

    await fillOutReport(user);
    await user.click(
      screen.getByRole("button", { name: /submit anonymous report/i })
    );

    expect(addDoc).toHaveBeenCalledTimes(1);

    const payload = addDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toHaveProperty("createdAt");
    expect(payload).not.toHaveProperty("submittedAt");
  });

  it("submits the answers the user actually gave", async () => {
    const user = userEvent.setup();
    render(<Report />);

    await fillOutReport(user);
    await user.click(
      screen.getByRole("button", { name: /submit anonymous report/i })
    );

    const payload = addDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toMatchObject({
      campus: "Notre-Dame",
      location: "Residence Halls",
      offenseTypes: ["verbal-aggression"],
      time: "within-24-hours",
      recaptchaToken: "test-recaptcha-token",
    });
  });

  it("writes through the shared report converter", async () => {
    const user = userEvent.setup();
    render(<Report />);

    await fillOutReport(user);
    await user.click(
      screen.getByRole("button", { name: /submit anonymous report/i })
    );

    expect(withConverter).toHaveBeenCalled();
  });

  it("shows the report id after a successful submit", async () => {
    const user = userEvent.setup();
    render(<Report />);

    await fillOutReport(user);
    await user.click(
      screen.getByRole("button", { name: /submit anonymous report/i })
    );

    expect(await screen.findByText(/test-report-id/)).toBeInTheDocument();
  });

  it("keeps the user on the form when the write fails", async () => {
    addDoc.mockRejectedValueOnce(new Error("firestore unavailable"));
    const user = userEvent.setup();
    render(<Report />);

    await fillOutReport(user);
    await user.click(
      screen.getByRole("button", { name: /submit anonymous report/i })
    );

    expect(window.alert).toHaveBeenCalled();
    expect(
      screen.queryByText(/report submitted successfully/i)
    ).not.toBeInTheDocument();
  });
});
