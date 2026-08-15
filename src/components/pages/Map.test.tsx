// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const getDocs = vi.hoisted(() => vi.fn());

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ withConverter: vi.fn(() => ({})) })),
  query: vi.fn((ref) => ref),
  getDocs,
}));

vi.mock("../../config/firebase", () => ({ db: {} }));

// Leaflet and the MapTiler SDK need a real canvas/WebGL context, which jsdom
// has not got. The behaviour under test here is render-time data handling, not
// tile rendering, so the map itself is stubbed out.
vi.mock("@maptiler/leaflet-maptilersdk", () => ({
  MaptilerLayer: class {
    addTo() {
      return this;
    }
  },
}));

vi.mock("leaflet", () => {
  const layerGroup = { addTo: () => layerGroup, clearLayers: () => {} };
  const map = {
    setView: () => map,
    setMinZoom: () => map,
    setMaxBounds: () => map,
    fitBounds: () => map,
  };
  const circle = {
    addTo: () => circle,
    bindPopup: () => circle,
  };

  return {
    default: {
      map: () => map,
      layerGroup: () => layerGroup,
      circle: () => circle,
      latLngBounds: () => ({}),
    },
  };
});

import Map from "./Map.tsx";

function timestamp(millis: number) {
  return { toMillis: () => millis };
}

function doc(data: Record<string, unknown>) {
  return { data: () => data };
}

const validReport = {
  userID: "",
  campus: "Notre-Dame",
  location: "Residence Halls",
  specificLocation: "Alumni Hall",
  offenseTypes: ["verbal-aggression"],
  individualsInvolved: 1,
  time: "within-24-hours",
  additionalInfo: "",
  createdAt: timestamp(Date.now()),
};

describe("Map page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders reports without crashing", async () => {
    getDocs.mockResolvedValueOnce({ docs: [doc(validReport)] });

    render(<Map />);

    await waitFor(() => {
      expect(screen.queryByText(/loading incident data/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/map filters/i)).toBeInTheDocument();
  });

  it("survives legacy documents that have no createdAt", async () => {
    // The outage: these documents were written before the timestamp field was
    // renamed, so reading `.toMillis()` threw mid-render. With no ErrorBoundary
    // anywhere in the tree, React unmounted everything and /map went blank.
    const legacy = { ...validReport, createdAt: undefined };
    getDocs.mockResolvedValueOnce({ docs: [doc(legacy), doc(validReport)] });

    render(<Map />);

    await waitFor(() => {
      expect(screen.queryByText(/loading incident data/i)).not.toBeInTheDocument();
    });
    // Still rendered — the page did not blank out.
    expect(screen.getByText(/map filters/i)).toBeInTheDocument();
  });

  it("does not crash when every document is legacy", async () => {
    const legacy = { ...validReport, createdAt: undefined };
    getDocs.mockResolvedValueOnce({ docs: [doc(legacy), doc(legacy)] });

    render(<Map />);

    await waitFor(() => {
      expect(screen.queryByText(/loading incident data/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/map filters/i)).toBeInTheDocument();
  });

  it("shows an error overlay instead of a blank page when the fetch fails", async () => {
    getDocs.mockRejectedValueOnce(new Error("permission denied"));

    render(<Map />);

    expect(
      await screen.findByText(/failed to fetch incident data/i)
    ).toBeInTheDocument();
  });

  it("renders an empty collection without error", async () => {
    getDocs.mockResolvedValueOnce({ docs: [] });

    render(<Map />);

    await waitFor(() => {
      expect(screen.queryByText(/loading incident data/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/showing 0 incidents/i)).toBeInTheDocument();
  });
});
