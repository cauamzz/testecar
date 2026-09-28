import { describe, it, expect } from "vitest";
import { filterVehicles } from "../../src/lib/filters";
import { leadSchema, vehicleSchema } from "../../src/lib/validation";
import type { Vehicle } from "../../src/lib/types";
// Test fixtures only: never imported by the application or used as inventory.
const fixture = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "veiculo-teste",
  brand: "Marca teste",
  model: "Modelo teste",
  version: "Elétrico",
  year_manufacture: 2023,
  year_model: 2024,
  price: 100000,
  mileage: 20000,
  fuel: "Elétrico",
  transmission: "Automático",
  color: "Branco",
  body_type: "SUV",
  engine: "",
  steering: "Elétrica",
  plate_final: "8",
  description: "",
  status: "available",
  featured: false,
  created_at: "",
  updated_at: "",
  vehicle_images: [],
  vehicle_features: [
    {
      feature_id: "22222222-2222-4222-8222-222222222222",
      features: {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Teto solar",
      },
    },
  ],
} satisfies Vehicle;
describe("Public inventory filtering", () => {
  it("matches free text without accents", () =>
    expect(filterVehicles([fixture], { q: "eletrico" })).toHaveLength(1));
  it("combines brand, price, mileage and optional", () => {
    expect(
      filterVehicles([fixture], {
        brand: "Marca teste",
        price_max: "100000",
        mileage_max: "20000",
        feature: fixture.vehicle_features[0].feature_id,
      }),
    ).toHaveLength(1);
    expect(
      filterVehicles([fixture], { brand: "Outra marca", price_max: "100000" }),
    ).toHaveLength(0);
  });
  it("honors numeric boundaries and sort without mutating source", () => {
    const list = [
      fixture,
      { ...fixture, id: "second", price: 90000, mileage: 10000 },
    ];
    expect(filterVehicles(list, { sort: "price_asc" })[0].id).toBe("second");
    expect(list[0].id).toBe(fixture.id);
    expect(filterVehicles(list, { year_min: "2025" })).toHaveLength(0);
    expect(filterVehicles(list, { price_min: "95000" })).toHaveLength(1);
  });
});
describe("Input validation", () => {
  it("accepts the full notes limit offered by the selling form", () => {
    expect(
      leadSchema.safeParse({
        name: "Pessoa Teste",
        email: "teste@example.com",
        phone: "11999991234",
        type: "sell_vehicle",
        vehicle_id: null,
        message: "",
        details: { notes: "a".repeat(1500) },
        consent: true,
        website: "",
      }).success,
    ).toBe(true);
  });
  it("rejects invalid manufacture/model years and negative prices", () => {
    expect(
      vehicleSchema.safeParse({ ...fixture, year_model: 2022 }).success,
    ).toBe(false);
    expect(vehicleSchema.safeParse({ ...fixture, price: -1 }).success).toBe(
      false,
    );
    expect(vehicleSchema.safeParse(fixture).success).toBe(true);
  });
  const lead = {
    name: "Pessoa Teste",
    email: "teste@example.com",
    phone: "(11) 99999-1234",
    type: "contact",
    vehicle_id: null,
    message: "Teste",
    details: {},
    consent: true,
    website: "",
  };
  it("normalizes telephone and requires consent", () => {
    expect(leadSchema.parse(lead).phone).toBe("11999991234");
    expect(leadSchema.safeParse({ ...lead, consent: false }).success).toBe(
      false,
    );
  });
  it("rejects honeypot and invalid contacts", () => {
    expect(leadSchema.safeParse({ ...lead, website: "bot" }).success).toBe(
      false,
    );
    expect(leadSchema.safeParse({ ...lead, phone: "123" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...lead, email: "invalid" }).success).toBe(
      false,
    );
  });
});
